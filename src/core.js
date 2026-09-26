(function (global) {
  "use strict";

  // ---------- colour ----------
  function hexToRgb(h) { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
  function rgbToHex(r, g, b) { return "#" + [r, g, b].map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join(""); }
  function colorDist(a, b) {
    const rm = (a[0] + b[0]) / 2, dr = a[0] - b[0], dg = a[1] - b[1], db = a[2] - b[2];
    return (2 + rm / 256) * dr * dr + 4 * dg * dg + (2 + (255 - rm) / 256) * db * db;
  }
  function luma(r, g, b) { return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255; }

  // k-means palette extraction from RGBA pixel data
  function kmeans(data, k) {
    const n = data.length / 4, step = Math.max(1, Math.floor(n / 8000)), pts = [];
    for (let i = 0; i < n; i += step) { const o = i * 4; if (data[o + 3] >= 128) pts.push([data[o], data[o + 1], data[o + 2]]); }
    if (!pts.length) return [];
    k = Math.min(k, pts.length);
    let first = pts[0], bl = Infinity;
    for (const p of pts) { const l = luma(p[0], p[1], p[2]); if (l < bl) { bl = l; first = p; } }
    const cents = [first.slice()], dmin = pts.map(p => colorDist(p, first));
    while (cents.length < k) {
      let bi = 0, bd = -1;
      for (let i = 0; i < pts.length; i++) if (dmin[i] > bd) { bd = dmin[i]; bi = i; }
      const c = pts[bi].slice(); cents.push(c);
      for (let i = 0; i < pts.length; i++) { const d = colorDist(pts[i], c); if (d < dmin[i]) dmin[i] = d; }
    }
    const asg = new Int32Array(pts.length);
    for (let it = 0; it < 16; it++) {
      for (let i = 0; i < pts.length; i++) {
        let bj = 0, bd = Infinity;
        for (let j = 0; j < k; j++) { const d = colorDist(pts[i], cents[j]); if (d < bd) { bd = d; bj = j; } }
        asg[i] = bj;
      }
      const sum = cents.map(() => [0, 0, 0, 0]);
      for (let i = 0; i < pts.length; i++) { const s = sum[asg[i]]; s[0] += pts[i][0]; s[1] += pts[i][1]; s[2] += pts[i][2]; s[3]++; }
      for (let j = 0; j < k; j++) if (sum[j][3]) cents[j] = [sum[j][0] / sum[j][3], sum[j][1] / sum[j][3], sum[j][2] / sum[j][3]];
    }
    return cents.sort((a, b) => luma(b[0], b[1], b[2]) - luma(a[0], a[1], a[2]));
  }

  // Map each grid cell to a filament slot (-1 = left out)
  function buildCellMap(img, slotsRgb, skip, smooth) {
    const gx = img.width, gy = img.height, N = gx * gy, d = img.data;
    let idx = new Int8Array(N); const lum = new Float32Array(N);
    for (let k = 0; k < N; k++) {
      const o = k * 4, px = [d[o], d[o + 1], d[o + 2]];
      lum[k] = luma(px[0], px[1], px[2]);
      if (d[o + 3] < 128) { idx[k] = -1; continue; }
      let bs = 0, bd = Infinity;
      for (let s = 0; s < slotsRgb.length; s++) { const dd = colorDist(px, slotsRgb[s]); if (dd < bd) { bd = dd; bs = s; } }
      idx[k] = skip[bs] ? -1 : bs;
    }
    for (let it = 0; it < smooth; it++) {
      const nx = new Int8Array(idx), cnt = new Int32Array(10);
      for (let j = 0; j < gy; j++) for (let i = 0; i < gx; i++) {
        cnt.fill(0); let tot = 0;
        for (let b = -1; b <= 1; b++) for (let a = -1; a <= 1; a++) {
          const x = i + a, y = j + b; if (x < 0 || y < 0 || x >= gx || y >= gy) continue;
          cnt[idx[y * gx + x] + 1]++; tot++;
        }
        let bv = 0, bc = -1; for (let v = 0; v < 10; v++) if (cnt[v] > bc) { bc = cnt[v]; bv = v; }
        if (bc >= Math.ceil(tot * 5 / 9)) nx[j * gx + i] = bv - 1;
      }
      idx = nx;
    }
    return { gx, gy, idx, lum };
  }

  // ---------- surface projection ----------
  // frame: {c,n,t,b} as [x,y,z]; soup: {pos: Float32Array tri soup, nrm: Float32Array|null}
  function makeProjector(soup, frame, halfW, halfH) {
    const { c, n, t, b } = frame;
    if (!soup) return (u, v) => ({ p: [c[0] + t[0] * u + b[0] * v, c[1] + t[1] * u + b[1] * v, c[2] + t[2] * u + b[2] * v], n: n.slice() });
    const P = soup.pos, T = P.length / 9, B = 96, e = 1e-6;
    const minU = -halfW - e, minV = -halfH - e, du = (2 * halfW + 2 * e) / B, dv = (2 * halfH + 2 * e) / B;
    const bins = new Array(B * B); for (let i = 0; i < bins.length; i++) bins[i] = [];
    const rec = [];
    for (let i = 0; i < T; i++) {
      const o = i * 9, uu = [0, 0, 0], vv = [0, 0, 0], hh = [0, 0, 0];
      for (let j = 0; j < 3; j++) {
        const x = P[o + j * 3] - c[0], y = P[o + j * 3 + 1] - c[1], z = P[o + j * 3 + 2] - c[2];
        uu[j] = x * t[0] + y * t[1] + z * t[2]; vv[j] = x * b[0] + y * b[1] + z * b[2]; hh[j] = x * n[0] + y * n[1] + z * n[2];
      }
      const mnU = Math.min(uu[0], uu[1], uu[2]), mxU = Math.max(uu[0], uu[1], uu[2]);
      const mnV = Math.min(vv[0], vv[1], vv[2]), mxV = Math.max(vv[0], vv[1], vv[2]);
      if (mxU < minU || mnU > halfW + e || mxV < minV || mnV > halfH + e) continue;
      const A = (uu[1] - uu[0]) * (vv[2] - vv[0]) - (uu[2] - uu[0]) * (vv[1] - vv[0]);
      if (Math.abs(A) < 1e-12) continue;
      const ax = P[o + 3] - P[o], ay = P[o + 4] - P[o + 1], az = P[o + 5] - P[o + 2];
      const bx = P[o + 6] - P[o], by = P[o + 7] - P[o + 1], bz = P[o + 8] - P[o + 2];
      let gxn = ay * bz - az * by, gyn = az * bx - ax * bz, gzn = ax * by - ay * bx;
      const gl = Math.hypot(gxn, gyn, gzn) || 1; gxn /= gl; gyn /= gl; gzn /= gl;
      const facing = gxn * n[0] + gyn * n[1] + gzn * n[2];
      const r = rec.length / 14;
      rec.push(uu[0], vv[0], uu[1], vv[1], uu[2], vv[2], hh[0], hh[1], hh[2], A, facing, i, 0, 0);
      const i0 = Math.max(0, Math.floor((mnU - minU) / du)), i1 = Math.min(B - 1, Math.floor((mxU - minU) / du));
      const j0 = Math.max(0, Math.floor((mnV - minV) / dv)), j1 = Math.min(B - 1, Math.floor((mxV - minV) / dv));
      for (let bj = j0; bj <= j1; bj++) for (let bi = i0; bi <= i1; bi++) bins[bj * B + bi].push(r);
    }
    const R = Float64Array.from(rec), N = soup.nrm;
    return function (u, v) {
      const bi = Math.min(B - 1, Math.max(0, Math.floor((u - minU) / du)));
      const bj = Math.min(B - 1, Math.max(0, Math.floor((v - minV) / dv)));
      const list = bins[bj * B + bi];
      let best = -Infinity, br = -1, w0b = 0, w1b = 0, w2b = 0;
      for (let q = 0; q < list.length; q++) {
        const o = list[q] * 14;
        const u0 = R[o], v0 = R[o + 1], A = R[o + 9];
        const w1 = ((u - u0) * (R[o + 5] - v0) - (R[o + 4] - u0) * (v - v0)) / A;
        const w2 = ((R[o + 2] - u0) * (v - v0) - (u - u0) * (R[o + 3] - v0)) / A;
        const w0 = 1 - w1 - w2;
        if (w0 < -1e-7 || w1 < -1e-7 || w2 < -1e-7) continue;
        const h = w0 * R[o + 6] + w1 * R[o + 7] + w2 * R[o + 8];
        if (h > best) { best = h; br = o; w0b = w0; w1b = w1; w2b = w2; }
      }
      if (br < 0 || R[br + 10] < 0.08) return null;
      const p = [c[0] + t[0] * u + b[0] * v + n[0] * best, c[1] + t[1] * u + b[1] * v + n[1] * best, c[2] + t[2] * u + b[2] * v + n[2] * best];
      const ti = R[br + 11] * 9;
      const ax = P[ti + 3] - P[ti], ay = P[ti + 4] - P[ti + 1], az = P[ti + 5] - P[ti + 2];
      const bx = P[ti + 6] - P[ti], by = P[ti + 7] - P[ti + 1], bz = P[ti + 8] - P[ti + 2];
      let gm = [ay * bz - az * by, az * bx - ax * bz, ax * by - ay * bx];
      const gl = Math.hypot(gm[0], gm[1], gm[2]) || 1; gm = gm.map(x => x / gl);
      let nm = null;
      if (N) {
        nm = [0, 1, 2].map(k => w0b * N[ti + k] + w1b * N[ti + 3 + k] + w2b * N[ti + 6 + k]);
        const l = Math.hypot(nm[0], nm[1], nm[2]);
        nm = l < 1e-9 ? null : nm.map(x => x / l);
        // averaged normals at a hard edge (flat plates) tilt the artwork: fall back to the face
        if (nm && (nm[0] * gm[0] + nm[1] * gm[1] + nm[2] * gm[2] < 0.9 || nm[0] * n[0] + nm[1] * n[1] + nm[2] * n[2] < 0.05)) nm = null;
      }
      if (!nm) nm = gm;
      return { p, n: nm };
    };
  }

  // ---------- watertight per-filament solids ----------
  function buildDecalSolids(cm, W, H, project, cellH, embed, nSlots) {
    const { gx, gy, idx } = cm, CW = gx + 1, CH = gy + 1;
    const cp = new Float64Array(CW * CH * 3), cn0 = new Float64Array(CW * CH * 3), cv = new Uint8Array(CW * CH);
    const need = new Uint8Array(CW * CH);
    for (let j = 0; j < gy; j++) for (let i = 0; i < gx; i++) if (idx[j * gx + i] >= 0) {
      need[j * CW + i] = need[j * CW + i + 1] = need[(j + 1) * CW + i] = need[(j + 1) * CW + i + 1] = 1;
    }
    for (let j = 0; j < CH; j++) for (let i = 0; i < CW; i++) {
      const ci = j * CW + i; if (!need[ci]) continue;
      const s = project((i / gx - 0.5) * W, (0.5 - j / gy) * H);
      if (!s) continue;
      cv[ci] = 1; cp[ci * 3] = s.p[0]; cp[ci * 3 + 1] = s.p[1]; cp[ci * 3 + 2] = s.p[2];
      cn0[ci * 3] = s.n[0]; cn0[ci * 3 + 1] = s.n[1]; cn0[ci * 3 + 2] = s.n[2];
    }
    const cn = new Float64Array(cn0.length);
    for (let j = 0; j < CH; j++) for (let i = 0; i < CW; i++) {
      const ci = j * CW + i; if (!cv[ci]) continue;
      let x = 0, y = 0, z = 0;
      for (let b = -1; b <= 1; b++) for (let a = -1; a <= 1; a++) {
        const X = i + a, Y = j + b; if (X < 0 || Y < 0 || X >= CW || Y >= CH) continue;
        const k = Y * CW + X; if (!cv[k]) continue;
        x += cn0[k * 3]; y += cn0[k * 3 + 1]; z += cn0[k * 3 + 2];
      }
      const l = Math.hypot(x, y, z) || 1; cn[ci * 3] = x / l; cn[ci * 3 + 1] = y / l; cn[ci * 3 + 2] = z / l;
    }
    const cellOk = (i, j, s) => i >= 0 && j >= 0 && i < gx && j < gy && idx[j * gx + i] === s &&
      cv[j * CW + i] && cv[j * CW + i + 1] && cv[(j + 1) * CW + i] && cv[(j + 1) * CW + i + 1];
    const out = [];
    for (let s = 0; s < nSlots; s++) {
      const pos = [], ind = [];
      const top = new Int32Array(CW * CH).fill(-1), bot = new Int32Array(CW * CH).fill(-1);
      const topV = ci => {
        if (top[ci] >= 0) return top[ci];
        const i = ci % CW, j = (ci / CW) | 0; let sum = 0, cnt = 0;
        for (let b = -1; b <= 0; b++) for (let a = -1; a <= 0; a++) if (cellOk(i + a, j + b, s)) { sum += cellH[(j + b) * gx + i + a]; cnt++; }
        const h = cnt ? sum / cnt : 0, o = ci * 3;
        pos.push(cp[o] + cn[o] * h, cp[o + 1] + cn[o + 1] * h, cp[o + 2] + cn[o + 2] * h);
        return (top[ci] = pos.length / 3 - 1);
      };
      const botV = ci => {
        if (bot[ci] >= 0) return bot[ci];
        const o = ci * 3;
        pos.push(cp[o] - cn[o] * embed, cp[o + 1] - cn[o + 1] * embed, cp[o + 2] - cn[o + 2] * embed);
        return (bot[ci] = pos.length / 3 - 1);
      };
      let any = false;
      for (let j = 0; j < gy; j++) for (let i = 0; i < gx; i++) {
        if (!cellOk(i, j, s)) continue; any = true;
        const A = j * CW + i, Bc = A + 1, D = A + CW, C = D + 1;
        const tA = topV(A), tB = topV(Bc), tC = topV(C), tD = topV(D);
        const bA = botV(A), bB = botV(Bc), bC = botV(C), bD = botV(D);
        ind.push(tA, tD, tC, tA, tC, tB, bA, bC, bD, bA, bB, bC);
        const edges = [[A, Bc, tA, tB, bA, bB, i, j - 1], [Bc, C, tB, tC, bB, bC, i + 1, j], [C, D, tC, tD, bC, bD, i, j + 1], [D, A, tD, tA, bD, bA, i - 1, j]];
        for (const e of edges) if (!cellOk(e[6], e[7], s)) ind.push(e[4], e[3], e[5], e[4], e[2], e[3]);
      }
      out.push(any ? { pos: new Float32Array(pos), idx: new Uint32Array(ind) } : null);
    }
    return out;
  }

  // ---------- mesh utilities ----------
  function weldSoup(pos, index) {
    const map = new Map(), P = [], I = [];
    const get = k3 => {
      const x = pos[k3], y = pos[k3 + 1], z = pos[k3 + 2];
      const key = Math.round(x * 1e4) + "," + Math.round(y * 1e4) + "," + Math.round(z * 1e4);
      let v = map.get(key); if (v === undefined) { v = P.length / 3; P.push(x, y, z); map.set(key, v); } return v;
    };
    const tcount = index ? index.length / 3 : pos.length / 9;
    for (let t = 0; t < tcount; t++) {
      const a = get((index ? index[t * 3] : t * 3) * 3), b = get((index ? index[t * 3 + 1] : t * 3 + 1) * 3), c = get((index ? index[t * 3 + 2] : t * 3 + 2) * 3);
      if (a !== b && b !== c && a !== c) I.push(a, b, c);
    }
    return { pos: new Float32Array(P), idx: new Uint32Array(I) };
  }

  function parseSTL(buf) {
    const dv = new DataView(buf);
    if (buf.byteLength >= 84) {
      const n = dv.getUint32(80, true);
      if (84 + n * 50 === buf.byteLength) {
        const out = new Float32Array(n * 9);
        for (let i = 0; i < n; i++) for (let k = 0; k < 9; k++) out[i * 9 + k] = dv.getFloat32(84 + i * 50 + 12 + k * 4, true);
        return out;
      }
    }
    const txt = new TextDecoder().decode(buf), re = /vertex\s+([-+\deE.]+)\s+([-+\deE.]+)\s+([-+\deE.]+)/g, v = []; let m;
    while ((m = re.exec(txt))) v.push(+m[1], +m[2], +m[3]);
    if (!v.length || v.length % 9) throw new Error("This file isn't a readable STL.");
    return new Float32Array(v);
  }

  // parts: [{name, slot, pos(Float32Array, Y-up), idx}] -> Z-up, centred, sitting on Z=0
  function prepareParts(parts) {
    let mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity];
    const conv = parts.map(p => {
      const q = new Float32Array(p.pos.length);
      for (let i = 0; i < p.pos.length; i += 3) {
        q[i] = p.pos[i]; q[i + 1] = -p.pos[i + 2]; q[i + 2] = p.pos[i + 1];
        for (let k = 0; k < 3; k++) { if (q[i + k] < mn[k]) mn[k] = q[i + k]; if (q[i + k] > mx[k]) mx[k] = q[i + k]; }
      }
      return { name: p.name, slot: p.slot, pos: q, idx: p.idx };
    });
    const off = [-(mn[0] + mx[0]) / 2, -(mn[1] + mx[1]) / 2, -mn[2]];
    for (const p of conv) for (let i = 0; i < p.pos.length; i += 3) { p.pos[i] += off[0]; p.pos[i + 1] += off[1]; p.pos[i + 2] += off[2]; }
    return { parts: conv, size: [mx[0] - mn[0], mx[1] - mn[1], mx[2] - mn[2]] };
  }

  const f = x => String(+x.toFixed(4));
  const esc = s => String(s).replace(/[&<>"]/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[ch]);

  function make3MF(parts, slots, title) {
    const V = [], Tr = [], vols = []; let vbase = 0, tbase = 0;
    for (const p of parts) {
      for (let i = 0; i < p.pos.length; i += 3) V.push('<vertex x="' + f(p.pos[i]) + '" y="' + f(p.pos[i + 1]) + '" z="' + f(p.pos[i + 2]) + '"/>');
      for (let i = 0; i < p.idx.length; i += 3) Tr.push('<triangle v1="' + (p.idx[i] + vbase) + '" v2="' + (p.idx[i + 1] + vbase) + '" v3="' + (p.idx[i + 2] + vbase) + '" pid="1" p1="' + p.slot + '"/>');
      const tc = p.idx.length / 3;
      vols.push({ name: p.name, slot: p.slot, first: tbase, last: tbase + tc - 1 });
      vbase += p.pos.length / 3; tbase += tc;
    }
    const mats = slots.map((s, i) => '<base name="' + esc(s.name || "Filament " + (i + 1)) + '" displaycolor="' + s.hex.toUpperCase() + 'FF"/>').join("");
    const model = '<?xml version="1.0" encoding="UTF-8"?>\n<model unit="millimeter" xml:lang="en-US" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02" xmlns:slic3rpe="http://schemas.slic3r.org/3mf/2017/06">\n' +
      '<metadata name="slic3rpe:Version3mf">1</metadata><metadata name="Title">' + esc(title) + '</metadata><metadata name="Application">PhotoRelief Studio</metadata>\n' +
      '<resources><basematerials id="1">' + mats + '</basematerials>\n<object id="2" name="' + esc(title) + '" type="model" pid="1" pindex="0"><mesh><vertices>\n' +
      V.join("\n") + '\n</vertices><triangles>\n' + Tr.join("\n") + '\n</triangles></mesh></object></resources>\n<build><item objectid="2"/></build>\n</model>';
    const config = '<?xml version="1.0" encoding="utf-8"?>\n<config>\n <object id="2" instances_count="1">\n  <metadata type="object" key="name" value="' + esc(title) + '"/>\n' +
      vols.map(v => '  <volume firstid="' + v.first + '" lastid="' + v.last + '">\n   <metadata type="volume" key="name" value="' + esc(v.name) + '"/>\n   <metadata type="volume" key="volume_type" value="ModelPart"/>\n   <metadata type="volume" key="extruder" value="' + (v.slot + 1) + '"/>\n  </volume>\n').join("") +
      ' </object>\n</config>';
    return {
      "[Content_Types].xml": '<?xml version="1.0" encoding="UTF-8"?>\n<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml"/><Default Extension="config" ContentType="text/xml"/></Types>',
      "_rels/.rels": '<?xml version="1.0" encoding="UTF-8"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Target="/3D/3dmodel.model" Id="rel0" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel"/></Relationships>',
      "3D/3dmodel.model": model,
      "Metadata/Slic3r_PE_model.config": config
    };
  }

  // Bambu Studio and Orca read a different 3mf layout: one object per colour, assembled with
  // components, and the extruder assignment in Metadata/model_settings.config.
  function make3MF_BBL(parts, slots, title) {
    const objs = [], cfg = [], ASSEMBLY = 1;
    let id = 2;
    const ids = [];
    for (const p of parts) {
      const V = [], T = [];
      for (let i = 0; i < p.pos.length; i += 3) V.push('<vertex x="' + f(p.pos[i]) + '" y="' + f(p.pos[i + 1]) + '" z="' + f(p.pos[i + 2]) + '"/>');
      for (let i = 0; i < p.idx.length; i += 3) T.push('<triangle v1="' + p.idx[i] + '" v2="' + p.idx[i + 1] + '" v3="' + p.idx[i + 2] + '"/>');
      objs.push('<object id="' + id + '" type="model"><mesh><vertices>\n' + V.join("\n") + '\n</vertices><triangles>\n' + T.join("\n") + '\n</triangles></mesh></object>');
      cfg.push('  <part id="' + id + '" subtype="normal_part">\n   <metadata key="name" value="' + esc(p.name) + '"/>\n   <metadata key="extruder" value="' + (p.slot + 1) + '"/>\n  </part>');
      ids.push(id); id++;
    }
    const comps = ids.map(i => '<component objectid="' + i + '" transform="1 0 0 0 1 0 0 0 1 0 0 0"/>').join("");
    const model = '<?xml version="1.0" encoding="UTF-8"?>\n<model unit="millimeter" xml:lang="en-US" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02" xmlns:BambuStudio="http://schemas.bambulab.com/package/2021">\n' +
      '<metadata name="Application">Maker Forge</metadata><metadata name="Title">' + esc(title) + '</metadata>\n<resources>\n' +
      objs.join("\n") + '\n<object id="' + ASSEMBLY + '" type="model"><components>' + comps + '</components></object>\n</resources>\n' +
      '<build><item objectid="' + ASSEMBLY + '" transform="1 0 0 0 1 0 0 0 1 0 0 0"/></build>\n</model>';
    const settings = '<?xml version="1.0" encoding="UTF-8"?>\n<config>\n <object id="' + ASSEMBLY + '">\n  <metadata key="name" value="' + esc(title) + '"/>\n  <metadata key="extruder" value="1"/>\n' +
      cfg.join("\n") + '\n </object>\n</config>';
    const project = JSON.stringify({
      filament_colour: slots.map(s => s.hex.toUpperCase()),
      filament_type: slots.map(s => (s.mat || "PLA").replace(/ .*/, "")),
      filament_settings_id: slots.map((s, i) => (s.name || "Filament " + (i + 1)))
    }, null, 1);
    return {
      "[Content_Types].xml": '<?xml version="1.0" encoding="UTF-8"?>\n<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml"/><Default Extension="config" ContentType="text/xml"/><Default Extension="png" ContentType="image/png"/></Types>',
      "_rels/.rels": '<?xml version="1.0" encoding="UTF-8"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Target="/3D/3dmodel.model" Id="rel-1" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel"/></Relationships>',
      "3D/3dmodel.model": model,
      "Metadata/model_settings.config": settings,
      "Metadata/project_settings.config": project
    };
  }

  function makeSTL(p) {
    const tc = p.idx.length / 3, buf = new ArrayBuffer(84 + tc * 50), dv = new DataView(buf);
    dv.setUint32(80, tc, true);
    for (let t = 0; t < tc; t++) {
      const o = 84 + t * 50, a = p.idx[t * 3] * 3, b = p.idx[t * 3 + 1] * 3, c = p.idx[t * 3 + 2] * 3, P = p.pos;
      const ux = P[b] - P[a], uy = P[b + 1] - P[a + 1], uz = P[b + 2] - P[a + 2], vx = P[c] - P[a], vy = P[c + 1] - P[a + 1], vz = P[c + 2] - P[a + 2];
      let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx; const l = Math.hypot(nx, ny, nz) || 1;
      dv.setFloat32(o, nx / l, true); dv.setFloat32(o + 4, ny / l, true); dv.setFloat32(o + 8, nz / l, true);
      [a, b, c].forEach((vi, k) => { for (let q = 0; q < 3; q++) dv.setFloat32(o + 12 + k * 12 + q * 4, P[vi + q], true); });
    }
    return buf;
  }

  function makeOBJ(parts, slots) {
    const L = ["# PhotoRelief Studio", "mtllib model.mtl"]; let base = 1;
    for (const p of parts) {
      L.push("o " + p.name.replace(/\s+/g, "_"), "usemtl filament_" + (p.slot + 1));
      for (let i = 0; i < p.pos.length; i += 3) L.push("v " + f(p.pos[i]) + " " + f(p.pos[i + 1]) + " " + f(p.pos[i + 2]));
      for (let i = 0; i < p.idx.length; i += 3) L.push("f " + (p.idx[i] + base) + " " + (p.idx[i + 1] + base) + " " + (p.idx[i + 2] + base));
      base += p.pos.length / 3;
    }
    const mtl = slots.map((s, i) => { const c = hexToRgb(s.hex).map(x => (x / 255).toFixed(4)); return "newmtl filament_" + (i + 1) + "\nKd " + c.join(" ") + "\nKa 0 0 0\nd 1"; }).join("\n\n");
    return { obj: L.join("\n"), mtl };
  }

  // ---------- outline tracing (crisp edges for logos, text, flat art) ----------
  // mask: Uint8Array(gx*gy) of 0/1 -> closed loops of integer corner points [x,y]
  function traceMask(mask, gx, gy) {
    const key = (x, y) => x * 100003 + y;
    const starts = new Map();
    const add = (x0, y0, x1, y1) => {
      const k = key(x0, y0); let a = starts.get(k);
      if (!a) { a = []; starts.set(k, a); }
      a.push([x0, y0, x1, y1, 0]);
    };
    const on = (x, y) => x >= 0 && y >= 0 && x < gx && y < gy && mask[y * gx + x];
    for (let j = 0; j < gy; j++) for (let i = 0; i < gx; i++) {
      if (!mask[j * gx + i]) continue;
      if (!on(i, j - 1)) add(i, j, i + 1, j);
      if (!on(i + 1, j)) add(i + 1, j, i + 1, j + 1);
      if (!on(i, j + 1)) add(i + 1, j + 1, i, j + 1);
      if (!on(i - 1, j)) add(i, j + 1, i, j);
    }
    const loops = [];
    for (const [, arr] of starts) for (const e of arr) {
      if (e[4]) continue;
      const loop = []; let cur = e, dir = [e[2] - e[0], e[3] - e[1]];
      while (cur && !cur[4]) {
        cur[4] = 1; loop.push([cur[0], cur[1]]);
        const nxt = starts.get(key(cur[2], cur[3])) || [];
        let best = null, bestTurn = -Infinity;
        for (const c of nxt) {
          if (c[4]) continue;
          const d = [c[2] - c[0], c[3] - c[1]];
          const cross = dir[0] * d[1] - dir[1] * d[0], dot = dir[0] * d[0] + dir[1] * d[1];
          const turn = Math.atan2(cross, dot);
          if (turn > bestTurn) { bestTurn = turn; best = c; }
        }
        if (!best) break;
        dir = [best[2] - best[0], best[3] - best[1]]; cur = best;
      }
      if (loop.length > 2) loops.push(loop);
    }
    return loops;
  }

  function area2(L) { let a = 0; for (let i = 0, n = L.length; i < n; i++) { const p = L[i], q = L[(i + 1) % n]; a += p[0] * q[1] - q[0] * p[1]; } return a / 2; }

  function chaikin(L, iters) {
    for (let it = 0; it < iters; it++) {
      const out = new Array(L.length * 2);
      for (let i = 0, n = L.length; i < n; i++) {
        const p = L[i], q = L[(i + 1) % n];
        out[i * 2] = [p[0] * 0.75 + q[0] * 0.25, p[1] * 0.75 + q[1] * 0.25];
        out[i * 2 + 1] = [p[0] * 0.25 + q[0] * 0.75, p[1] * 0.25 + q[1] * 0.75];
      }
      L = out;
    }
    return L;
  }

  // Douglas-Peucker on a closed loop: keeps corners, drops points a curve doesn't need
  function decimate(L, eps) {
    const n = L.length;
    if (n < 8 || eps <= 0) return L;
    let far = 1, fd = -1;
    for (let i = 1; i < n; i++) { const d = (L[i][0] - L[0][0]) ** 2 + (L[i][1] - L[0][1]) ** 2; if (d > fd) { fd = d; far = i; } }
    const keep = new Uint8Array(n); keep[0] = keep[far] = 1;
    const stack = [[0, far], [far, n]];
    while (stack.length) {
      const [a, b] = stack.pop(), pa = L[a], pb = L[b % n];
      if (b - a < 2) continue;
      const ux = pb[0] - pa[0], uy = pb[1] - pa[1], l = Math.hypot(ux, uy);
      let worst = -1, wd = eps;
      for (let i = a + 1; i < b; i++) {
        const p = L[i];
        const d = l < 1e-9 ? Math.hypot(p[0] - pa[0], p[1] - pa[1]) : Math.abs((p[0] - pa[0]) * uy - (p[1] - pa[1]) * ux) / l;
        if (d > wd) { wd = d; worst = i; }
      }
      if (worst > 0) { keep[worst] = 1; stack.push([a, worst], [worst, b]); }
    }
    const out = [];
    for (let i = 0; i < n; i++) if (keep[i]) out.push(L[i]);
    return out.length > 3 ? out : L;
  }

  function pointInLoop(pt, L) {
    let inside = false;
    for (let i = 0, j = L.length - 1; i < L.length; j = i++) {
      const a = L[i], b = L[j];
      if ((a[1] > pt[1]) !== (b[1] > pt[1]) && pt[0] < (b[0] - a[0]) * (pt[1] - a[1]) / (b[1] - a[1]) + a[0]) inside = !inside;
    }
    return inside;
  }

  // loops (any winding) -> [{outer(CCW), holes(CW)}]
  function groupLoops(loops) {
    const outers = [], holes = [];
    for (const L of loops) { const a = area2(L); if (Math.abs(a) < 1e-9) continue; (a > 0 ? outers : holes).push({ L, a: Math.abs(a) }); }
    outers.sort((x, y) => x.a - y.a);
    const polys = outers.map(o => ({ outer: o.L, holes: [] }));
    for (const h of holes) {
      const p = h.L[0];
      for (let i = 0; i < outers.length; i++) if (pointInLoop(p, outers[i].L)) { polys[i].holes.push(h.L); break; }
    }
    return polys;
  }

  // polygons in a right-handed 2D frame -> {pts, tris} with positive (CCW) winding
  function triangulate(polys, maxLen) {
    const pts = [], tris = [];
    for (const poly of polys) {
      const flat = [], holeIdx = [], base = pts.length;
      const push = L => { for (const p of L) { flat.push(p[0], p[1]); pts.push([p[0], p[1]]); } };
      push(poly.outer);
      for (const h of poly.holes) { holeIdx.push(flat.length / 2); push(h); }
      const t = global.earcut(flat, holeIdx, 2);
      for (let i = 0; i < t.length; i += 3) tris.push(t[i] + base, t[i + 1] + base, t[i + 2] + base);
    }
    for (let i = 0; i < tris.length; i += 3) {
      const a = pts[tris[i]], b = pts[tris[i + 1]], c = pts[tris[i + 2]];
      if ((b[0] - a[0]) * (c[1] - a[1]) - (c[0] - a[0]) * (b[1] - a[1]) < 0) { const t = tris[i + 1]; tris[i + 1] = tris[i + 2]; tris[i + 2] = t; }
    }
    if (maxLen > 0) refine(pts, tris, maxLen);
    return { pts, tris };
  }

  // Conforming refinement: an edge is split in every triangle that shares it, so the
  // surface stays watertight (no T-junctions) when it is later draped over a curve.
  function refine(pts, tris, maxLen) {
    const lim = maxLen * maxLen, cap = 300000;
    const ekey = (a, b) => (a < b ? a + ":" + b : b + ":" + a);
    for (let pass = 0; pass < 7; pass++) {
      const marks = new Map();
      for (let i = 0; i < tris.length; i += 3) for (let k = 0; k < 3; k++) {
        const a = tris[i + k], b = tris[i + (k + 1) % 3];
        const pa = pts[a], pb = pts[b];
        if ((pa[0] - pb[0]) ** 2 + (pa[1] - pb[1]) ** 2 > lim) marks.set(ekey(a, b), -1);
      }
      if (!marks.size || pts.length + marks.size > cap) break;
      for (const k of marks.keys()) {
        const [a, b] = k.split(":").map(Number);
        marks.set(k, pts.length); pts.push([(pts[a][0] + pts[b][0]) / 2, (pts[a][1] + pts[b][1]) / 2]);
      }
      const out = [];
      for (let i = 0; i < tris.length; i += 3) {
        const v = [tris[i], tris[i + 1], tris[i + 2]];
        const m = [marks.get(ekey(v[0], v[1])), marks.get(ekey(v[1], v[2])), marks.get(ekey(v[2], v[0]))];
        const n = m.filter(x => x !== undefined).length;
        if (n === 0) { out.push(v[0], v[1], v[2]); continue; }
        if (n === 3) {
          out.push(v[0], m[0], m[2], m[0], v[1], m[1], m[2], m[1], v[2], m[0], m[1], m[2]); continue;
        }
        let r = 0;
        if (n === 1) { r = m.findIndex(x => x !== undefined); } else { r = (m.findIndex(x => x === undefined) + 1) % 3; }
        const a = v[r], b = v[(r + 1) % 3], c = v[(r + 2) % 3];
        const m0 = marks.get(ekey(a, b)), m1 = marks.get(ekey(b, c));
        if (n === 1) out.push(a, m0, c, m0, b, c);
        else out.push(a, m0, m1, a, m1, c, m0, b, m1);
      }
      tris.length = 0; for (const x of out) tris.push(x);
    }
  }

  // Closed solid from a planar triangulation. topFn/botFn map a 2D point to 3D (null = off surface).
  function solidFromTris(pts, tris, topFn, botFn) {
    const top = new Array(pts.length), bot = new Array(pts.length), pos = [], ind = [];
    const T = pts.map(topFn), B = pts.map(botFn);
    const ok = i => T[i] && B[i];
    const vt = i => { if (top[i] === undefined) { pos.push(T[i][0], T[i][1], T[i][2]); top[i] = pos.length / 3 - 1; } return top[i]; };
    const vb = i => { if (bot[i] === undefined) { pos.push(B[i][0], B[i][1], B[i][2]); bot[i] = pos.length / 3 - 1; } return bot[i]; };
    const keep = [];
    for (let i = 0; i < tris.length; i += 3) if (ok(tris[i]) && ok(tris[i + 1]) && ok(tris[i + 2])) keep.push(tris[i], tris[i + 1], tris[i + 2]);
    if (!keep.length) return null;
    const count = new Map(), bump = (a, b) => count.set(a + ":" + b, (count.get(a + ":" + b) || 0) + 1);
    for (let i = 0; i < keep.length; i += 3) {
      const a = keep[i], b = keep[i + 1], c = keep[i + 2];
      ind.push(vt(a), vt(b), vt(c), vb(a), vb(c), vb(b));
      bump(a, b); bump(b, c); bump(c, a);
    }
    // every directed edge without a matching opposite is an open border: close it with a wall
    for (const [e, n] of count) {
      const [a, b] = e.split(":").map(Number);
      const back = count.get(b + ":" + a) || 0;
      for (let k = 0; k < n - back; k++) ind.push(vb(a), vb(b), vt(b), vb(a), vt(b), vt(a));
    }
    return { pos: new Float32Array(pos), idx: new Uint32Array(ind) };
  }

  // Turn any pixel mask into a solid draped on a surface (shared by artwork, outlines and plates).
  function buildMaskSolid(mask, gx, gy, W, H, project, height, embed, opts) {
    opts = opts || {};
    const polys = maskToPolys(mask, gx, gy, {
      mmPerPx: W / gx, smooth: opts.smoothEdges ?? 2,
      eps: opts.eps ?? Math.max(0.03, (W / gx) * 0.5),
      minArea: opts.minArea ?? (W / gx) * (W / gx) * 4
    });
    if (!polys.length) return null;
    const { pts, tris } = triangulate(polys, opts.maxLen || 0);
    return solidFromTris(pts, tris,
      p => { const s = project(p[0], p[1]); return s ? [s.p[0] + s.n[0] * height, s.p[1] + s.n[1] * height, s.p[2] + s.n[2] * height] : null; },
      p => { const s = project(p[0], p[1]); return s ? [s.p[0] - s.n[0] * embed, s.p[1] - s.n[1] * embed, s.p[2] - s.n[2] * embed] : null; });
  }
  function maskOfSlot(cm, slot) {
    const m = new Uint8Array(cm.gx * cm.gy); let any = false;
    for (let i = 0; i < m.length; i++) if (cm.idx[i] === slot) { m[i] = 1; any = true; }
    return any ? m : null;
  }
  // Open edges reveal a mesh a slicer would have to repair; volume feeds the material estimate.
  function checkMesh(solid) {
    if (!solid) return { tris: 0, open: 0, volume: 0 };
    const I = solid.idx, P = solid.pos, E = I.length;
    let vol = 0, nv = P.length / 3;
    for (let t = 0; t < E; t++) if (I[t] >= nv) nv = I[t] + 1;
    // every directed edge a -> b as one exact number, sorted: a closed mesh has each edge once each way
    const keys = new Float64Array(E);
    for (let t = 0; t < E; t += 3) {
      for (let k = 0; k < 3; k++) keys[t + k] = I[t + k] * nv + I[t + (k + 1) % 3];
      const a = I[t] * 3, b = I[t + 1] * 3, c = I[t + 2] * 3;
      vol += (P[a] * (P[b + 1] * P[c + 2] - P[b + 2] * P[c + 1]) - P[a + 1] * (P[b] * P[c + 2] - P[b + 2] * P[c]) + P[a + 2] * (P[b] * P[c + 1] - P[b + 1] * P[c])) / 6;
    }
    keys.sort();
    const count = key => {                               // how often a directed edge occurs
      let lo = 0, hi = E;
      while (lo < hi) { const m = (lo + hi) >> 1; if (keys[m] < key) lo = m + 1; else hi = m; }
      let n = 0; while (lo + n < E && keys[lo + n] === key) n++;
      return n;
    };
    let open = 0;
    for (let i = 0; i < E;) {
      let j = i; while (j < E && keys[j] === keys[i]) j++;
      const k = keys[i], b = k % nv, a = (k - b) / nv;
      open += Math.abs(j - i - count(b * nv + a)); i = j;
    }
    return { tris: E / 3, open, volume: Math.abs(vol) };
  }
  function buildVectorSolid(cm, slot, W, H, project, height, embed, opts) {
    const { gx, gy, idx } = cm, mask = new Uint8Array(gx * gy);
    let any = false;
    for (let k = 0; k < gx * gy; k++) if (idx[k] === slot) { mask[k] = 1; any = true; }
    if (!any) return null;
    const cell = W / gx, eps = (opts.eps ?? 0.25) * cell;
    let loops = traceMask(mask, gx, gy).map(L => {
      let M = L.map(p => [(p[0] / gx - 0.5) * W, (0.5 - p[1] / gy) * H]).reverse();
      M = chaikin(M, opts.smoothEdges ?? 2);
      return decimate(M, eps);
    }).filter(L => L.length > 2 && Math.abs(area2(L)) > cell * cell * 0.4);
    if (!loops.length) return null;
    const { pts, tris } = triangulate(groupLoops(loops), opts.maxLen || 0);
    return solidFromTris(pts, tris,
      p => { const s = project(p[0], p[1]); return s ? [s.p[0] + s.n[0] * height, s.p[1] + s.n[1] * height, s.p[2] + s.n[2] * height] : null; },
      p => { const s = project(p[0], p[1]); return s ? [s.p[0] - s.n[0] * embed, s.p[1] - s.n[1] * embed, s.p[2] - s.n[2] * embed] : null; });
  }

  // ---------- distance fields on masks (outline plates, inset accents) ----------
  function edt1d(f, n, d, v, z) {
    let k = 0; v[0] = 0; z[0] = -Infinity; z[1] = Infinity;
    for (let q = 1; q < n; q++) {
      let s = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
      while (s <= z[k]) { k--; s = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]); }
      k++; v[k] = q; z[k] = s; z[k + 1] = Infinity;
    }
    k = 0;
    for (let q = 0; q < n; q++) { while (z[k + 1] < q) k++; d[q] = (q - v[k]) * (q - v[k]) + f[v[k]]; }
  }
  // distance in pixels from every pixel to the nearest set pixel
  function edt(mask, w, h) {
    const m = Math.max(w, h), INF = 1e20;
    const f = new Float64Array(m), d = new Float64Array(m), v = new Int32Array(m), z = new Float64Array(m + 1);
    const out = new Float64Array(w * h);
    for (let i = 0; i < w * h; i++) out[i] = mask[i] ? 0 : INF;
    for (let x = 0; x < w; x++) { for (let y = 0; y < h; y++) f[y] = out[y * w + x]; edt1d(f, h, d, v, z); for (let y = 0; y < h; y++) out[y * w + x] = d[y]; }
    for (let y = 0; y < h; y++) { for (let x = 0; x < w; x++) f[x] = out[y * w + x]; edt1d(f, w, d, v, z); for (let x = 0; x < w; x++) out[y * w + x] = Math.sqrt(d[x]); }
    return out;
  }
  function dilateMask(mask, w, h, r) {
    if (r <= 0) return Uint8Array.from(mask);
    const d = edt(mask, w, h), out = new Uint8Array(w * h);
    for (let i = 0; i < out.length; i++) out[i] = d[i] <= r ? 1 : 0;
    return out;
  }
  function erodeMask(mask, w, h, r) {
    const inv = new Uint8Array(w * h);
    for (let i = 0; i < inv.length; i++) inv[i] = mask[i] ? 0 : 1;
    const d = edt(inv, w, h), out = new Uint8Array(w * h);
    for (let i = 0; i < out.length; i++) out[i] = mask[i] && d[i] > r ? 1 : 0;
    return out;
  }
  // 4-connected components, for finding the dots on i and j
  function labelMask(mask, w, h) {
    const lab = new Int32Array(w * h).fill(-1), comps = [], stack = [];
    for (let s = 0; s < w * h; s++) {
      if (!mask[s] || lab[s] >= 0) continue;
      const id = comps.length, c = { id, area: 0, minX: w, maxX: 0, minY: h, maxY: 0, cx: 0, cy: 0 };
      lab[s] = id; stack.push(s);
      while (stack.length) {
        const p = stack.pop(), x = p % w, y = (p / w) | 0;
        c.area++; c.cx += x; c.cy += y;
        if (x < c.minX) c.minX = x; if (x > c.maxX) c.maxX = x;
        if (y < c.minY) c.minY = y; if (y > c.maxY) c.maxY = y;
        if (x > 0 && mask[p - 1] && lab[p - 1] < 0) { lab[p - 1] = id; stack.push(p - 1); }
        if (x < w - 1 && mask[p + 1] && lab[p + 1] < 0) { lab[p + 1] = id; stack.push(p + 1); }
        if (y > 0 && mask[p - w] && lab[p - w] < 0) { lab[p - w] = id; stack.push(p - w); }
        if (y < h - 1 && mask[p + w] && lab[p + w] < 0) { lab[p + w] = id; stack.push(p + w); }
      }
      c.cx /= c.area; c.cy /= c.area; comps.push(c);
    }
    return { lab, comps };
  }
  // mask (pixels, y down) -> polygons in millimetres, centred on the mask.
  // Default path: trace the zero level of the mask's signed distance field, which gives
  // smooth curves instead of pixel staircases. { stepped:true } keeps the old exact-pixel trace.
  function maskToPolys(mask, w, h, o) {
    if (o && o.stepped) return maskToPolysStepped(mask, w, h, o);
    const s = o.mmPerPx;
    // a light blur turns the hard pixel mask into a coverage field; its 0.5 level is a smooth
    // curve that sits where the pixel edge was, within a fraction of a pixel
    return fieldToPolys(blurMask(mask, w, h, o.blur ?? 1), w, h, {
      mmPerPx: s, iso: 0.5,
      eps: o.eps != null ? Math.min(o.eps, s * 0.6) : s * 0.3,
      minSeg: s * 0.4,
      minArea: o.minArea ?? s * s * 4,
      smooth: 0
    });
  }
  function maskToPolysStepped(mask, w, h, o) {
    const s = o.mmPerPx, eps = o.eps ?? s * 0.35, minArea = o.minArea ?? s * s * 6;
    const loops = traceMask(mask, w, h).map(L => {
      let M = L.map(p => [(p[0] - w / 2) * s, (h / 2 - p[1]) * s]).reverse();
      M = chaikin(M, o.smooth ?? 2);
      return decimate(M, eps);
    }).filter(L => L.length > 2 && Math.abs(area2(L)) > minArea);
    return loops.length ? groupLoops(loops) : [];
  }
  function extrudePolysAt(polys, y0, y1) {
    if (!polys.length) return null;
    const { pts, tris } = triangulate(polys, 0);
    return solidFromTris(pts, tris, p => [p[0], y1, -p[1]], p => [p[0], y0, -p[1]]);
  }
  // ---------- turned (revolved) solids: bobble heads, vases, knobs ----------
  function signedVolume(s) {
    const I = s.idx, P = s.pos; let v = 0;
    for (let t = 0; t < I.length; t += 3) {
      const a = I[t] * 3, b = I[t + 1] * 3, c = I[t + 2] * 3;
      v += (P[a] * (P[b + 1] * P[c + 2] - P[b + 2] * P[c + 1]) - P[a + 1] * (P[b] * P[c + 2] - P[b + 2] * P[c]) + P[a + 2] * (P[b] * P[c + 1] - P[b + 1] * P[c])) / 6;
    }
    return v;
  }
  // profile: [[radius, y], ...] bottom to top. Radius 0 closes the surface on the axis.
  function revolve(profile, segs) {
    segs = segs || 96;
    const pos = [], ind = [], rings = [];
    for (const [r, y] of profile) {
      if (r <= 1e-6) { pos.push(0, y, 0); rings.push([pos.length / 3 - 1]); continue; }
      const ring = [];
      for (let s = 0; s < segs; s++) { const a = s / segs * Math.PI * 2; pos.push(Math.cos(a) * r, y, Math.sin(a) * r); ring.push(pos.length / 3 - 1); }
      rings.push(ring);
    }
    for (let i = 0; i < rings.length - 1; i++) {
      const A = rings[i], B = rings[i + 1];
      if (A.length === 1 && B.length === 1) continue;
      for (let s = 0; s < segs; s++) {
        const s2 = (s + 1) % segs;
        if (A.length === 1) ind.push(A[0], B[s2], B[s]);   // bottom apex winds opposite to the wall above it
        else if (B.length === 1) ind.push(A[s], A[s2], B[0]);
        else ind.push(A[s], A[s2], B[s2], A[s], B[s2], B[s]);
      }
    }
    const cap = (ring, y, top) => {
      pos.push(0, y, 0); const c = pos.length / 3 - 1;
      for (let s = 0; s < segs; s++) { const s2 = (s + 1) % segs; if (top) ind.push(c, ring[s], ring[s2]); else ind.push(c, ring[s2], ring[s]); }
    };
    if (rings[0].length > 1) cap(rings[0], profile[0][1], false);
    if (rings[rings.length - 1].length > 1) cap(rings[rings.length - 1], profile[profile.length - 1][1], true);
    const solid = { pos: new Float32Array(pos), idx: new Uint32Array(ind) };
    if (signedVolume(solid) < 0) for (let i = 0; i < solid.idx.length; i += 3) { const t = solid.idx[i + 1]; solid.idx[i + 1] = solid.idx[i + 2]; solid.idx[i + 2] = t; }
    return solid;
  }

  // Closed-loop turning: the profile is a closed outline in the (radius, y) half plane, so a
  // shape can have a bore, a hollow wall or a torus section. Points at radius 0 collapse to a pole.
  function revolveLoop(profile, segs) {
    segs = segs || 96;
    const n = profile.length, pos = [], ind = [];
    const ring = new Int32Array(n * segs).fill(-1), pole = new Int32Array(n).fill(-1);
    const vert = (i, j) => {
      const [r, y] = profile[i];
      if (r <= 1e-6) { if (pole[i] < 0) { pos.push(0, y, 0); pole[i] = pos.length / 3 - 1; } return pole[i]; }
      const k = i * segs + (j % segs);
      if (ring[k] < 0) { const a = (j % segs) / segs * Math.PI * 2; pos.push(Math.cos(a) * r, y, Math.sin(a) * r); ring[k] = pos.length / 3 - 1; }
      return ring[k];
    };
    for (let i = 0; i < n; i++) {
      const i2 = (i + 1) % n;
      if (profile[i][0] <= 1e-6 && profile[i2][0] <= 1e-6) continue;   // segment lying on the axis
      for (let j = 0; j < segs; j++) {
        const a = vert(i, j), b = vert(i2, j), c = vert(i2, j + 1), d = vert(i, j + 1);
        if (a !== b && b !== c && a !== c) ind.push(a, b, c);
        if (a !== c && c !== d && a !== d) ind.push(a, c, d);
      }
    }
    let solid = { pos: new Float32Array(pos), idx: new Uint32Array(ind) };
    if (signedVolume(solid) < 0) {
      const idx = solid.idx;
      for (let i = 0; i < idx.length; i += 3) { const t = idx[i + 1]; idx[i + 1] = idx[i + 2]; idx[i + 2] = t; }
    }
    return solid;
  }

  // Tube swept along a 3D polyline with parallel-transport frames: springs, coils, wires.
  function sweepTube(path, radius, segs, caps) {
    segs = segs || 16;
    const n = path.length;
    if (n < 2) return null;
    const pos = [], ind = [];
    const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
    const norm = v => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };
    const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
    const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
    let tan = norm(sub(path[1], path[0]));
    let up = Math.abs(tan[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0];
    let u = norm(cross(up, tan)), v = cross(tan, u);
    for (let i = 0; i < n; i++) {
      if (i > 0) {
        const t2 = norm(sub(path[Math.min(i + 1, n - 1)], path[i - 1]));
        const d = dot(u, t2);
        u = norm([u[0] - t2[0] * d, u[1] - t2[1] * d, u[2] - t2[2] * d]);
        v = cross(t2, u); tan = t2;
      }
      for (let j = 0; j < segs; j++) {
        const a = j / segs * Math.PI * 2, c = Math.cos(a) * radius, s = Math.sin(a) * radius;
        pos.push(path[i][0] + u[0] * c + v[0] * s, path[i][1] + u[1] * c + v[1] * s, path[i][2] + u[2] * c + v[2] * s);
      }
    }
    for (let i = 0; i < n - 1; i++) for (let j = 0; j < segs; j++) {
      const a = i * segs + j, b = i * segs + (j + 1) % segs, c = (i + 1) * segs + (j + 1) % segs, d = (i + 1) * segs + j;
      ind.push(a, b, c, a, c, d);
    }
    if (caps !== false) {
      const c0 = pos.length / 3; pos.push(path[0][0], path[0][1], path[0][2]);
      const c1 = pos.length / 3; pos.push(path[n - 1][0], path[n - 1][1], path[n - 1][2]);
      for (let j = 0; j < segs; j++) {
        ind.push(c0, (j + 1) % segs, j);
        ind.push(c1, (n - 1) * segs + j, (n - 1) * segs + (j + 1) % segs);
      }
    }
    let solid = { pos: new Float32Array(pos), idx: new Uint32Array(ind) };
    if (signedVolume(solid) < 0) {
      const idx = solid.idx;
      for (let i = 0; i < idx.length; i += 3) { const t = idx[i + 1]; idx[i + 1] = idx[i + 2]; idx[i + 2] = t; }
    }
    return solid;
  }

  // ---------- sub-pixel contours ----------
  // Marching squares over a scalar field with linear interpolation along cell edges, so the
  // outline follows the real curve instead of stepping around whole pixels.
  function traceField(f, w, h, iso) {
    // A region that reaches the edge of the grid would give chains that run off it, and closing
    // such a chain with a straight line cuts across the shape when it leaves and re-enters the
    // grid more than once (a name plate clipped by its canvas became three crossed fragments).
    // So when any border node is inside, trace a copy with a ring of outside nodes around it:
    // every region is then closed along the grid's edge, half a node outside the last inside
    // node (a pixel's outer edge). Nothing touches the border in the usual case, which keeps
    // exactly the old path.
    let edge = false;
    for (let i = 0; i < w && !edge; i++) edge = f[i] >= iso || f[(h - 1) * w + i] >= iso;
    for (let j = 0; j < h && !edge; j++) edge = f[j * w] >= iso || f[j * w + w - 1] >= iso;
    if (edge && w > 1 && h > 1) {
      const W = w + 2, H = h + 2, g = new (f.constructor === Array ? Float64Array : f.constructor)(W * H);
      const out = v => v >= iso ? iso - Math.max(v - iso, 1e-4) : v;   // mirrored about the level
      for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
        const si = Math.min(w - 1, Math.max(0, i - 1)), sj = Math.min(h - 1, Math.max(0, j - 1)), v = f[sj * w + si];
        g[j * W + i] = i === 0 || j === 0 || i === W - 1 || j === H - 1 ? out(v) : v;
      }
      const loops = traceField(g, W, H, iso);
      for (const L of loops) for (const p of L) { p[0] -= 1; p[1] -= 1; }
      return loops;
    }
    // every crossing lies on one grid edge: id 2k for the edge from node k to its right-hand
    // neighbour, 2k + 1 for the edge down to the node below. Chaining by edge id is exact and much
    // faster than matching rounded coordinates.
    const segA = [], segB = [];
    const pt = id => {
      const k = id >> 1, i = k % w, j = (k - i) / w, v0 = f[k];
      if (id & 1) { const v1 = f[k + w], t = (iso - v0) / ((v1 - v0) || 1e-9); return [i + 0.5, j + 0.5 + t]; }
      const v1 = f[k + 1], t = (iso - v0) / ((v1 - v0) || 1e-9); return [i + 0.5 + t, j + 0.5];
    };
    for (let j = 0; j < h - 1; j++) for (let i = 0; i < w - 1; i++) {
      const k = j * w + i, v00 = f[k], v10 = f[k + 1], v11 = f[k + w + 1], v01 = f[k + w];
      const c = (v00 >= iso ? 1 : 0) | (v10 >= iso ? 2 : 0) | (v11 >= iso ? 4 : 0) | (v01 >= iso ? 8 : 0);
      if (c === 0 || c === 15) continue;
      const top = 2 * k, right = 2 * (k + 1) + 1, bottom = 2 * (k + w), left = 2 * k + 1;
      const amb = (v00 + v10 + v11 + v01) / 4 >= iso;
      switch (c) {
        case 1: case 14: segA.push(left); segB.push(top); break;
        case 2: case 13: segA.push(top); segB.push(right); break;
        case 3: case 12: segA.push(left); segB.push(right); break;
        case 4: case 11: segA.push(right); segB.push(bottom); break;
        case 6: case 9: segA.push(top); segB.push(bottom); break;
        case 7: case 8: segA.push(bottom); segB.push(left); break;
        case 5: if (amb) { segA.push(left, right); segB.push(top, bottom); } else { segA.push(left, top); segB.push(bottom, right); } break;
        case 10: if (amb) { segA.push(top, bottom); segB.push(right, left); } else { segA.push(top, right); segB.push(left, bottom); } break;
      }
    }
    // Which side of a loop is filled: every crossing lies on a grid edge with one node inside, so the
    // side the filled region is on can be read off the geometry. (Sampling one node next to the
    // contour misreads it when that node sits exactly on the level, e.g. on a straight clip line.)
    const orient = ids => {
      const L = ids.map(pt), n = L.length, area = area2(L);
      let filled = true;
      for (let m = 0; m < n; m++) {
        const id = ids[m], k = id >> 1, i = k % w, j = (k - i) / w, down = id & 1, aIn = f[k] >= iso;
        const nx = (aIn ? i : i + (down ? 0 : 1)) + 0.5, ny = (aIn ? j : j + (down ? 1 : 0)) + 0.5;
        const P = L[m], Q = L[(m + 1) % n], dx = Q[0] - P[0], dy = Q[1] - P[1];
        const c = dx * (ny - P[1]) - dy * (nx - P[0]);
        if (Math.abs(c) > 1e-9) { filled = (c > 0) === (area > 0); break; }
      }
      if (filled ? area < 0 : area > 0) L.reverse();
      return L;
    };
    // a chain that runs off the edge of the grid is not a loop, so it has no inside of its own:
    // keep the old rule for those and sample the field at a point just inside the chain
    const sample = (x, y) => {
      const xi = Math.max(0, Math.min(w - 1, Math.round(x - 0.5))), yi = Math.max(0, Math.min(h - 1, Math.round(y - 0.5)));
      return f[yi * w + xi];
    };
    const sampled = L => {
      let p = null;
      for (let k = 0; k < L.length && !p; k++) {
        const y = (L[k][1] + L[(k + 1) % L.length][1]) / 2 + 1e-3, xs = [];
        for (let i = 0, j = L.length - 1; i < L.length; j = i++) {
          const a = L[i], b = L[j];
          if ((a[1] > y) !== (b[1] > y)) xs.push(a[0] + (y - a[1]) * (b[0] - a[0]) / (b[1] - a[1]));
        }
        if (xs.length >= 2) { xs.sort((m, n) => m - n); p = [(xs[0] + xs[1]) / 2, y]; }
      }
      const filled = p ? sample(p[0], p[1]) >= iso : true, area = area2(L);
      if (filled ? area < 0 : area > 0) L.reverse();
      return L;
    };
    // chain the segments into closed loops (each edge is shared by at most two segments)
    const n = segA.length, ends = new Map();
    const note = (e, s) => { const a = ends.get(e); if (a === undefined) ends.set(e, s); else if (typeof a === "number") ends.set(e, [a, s]); else a.push(s); };
    for (let s = 0; s < n; s++) { note(segA[s], s); note(segB[s], s); }
    const used = new Uint8Array(n), loops = [];
    for (let s0 = 0; s0 < n; s0++) {
      if (used[s0]) continue;
      used[s0] = 1;
      const first = segA[s0], ids = [first, segB[s0]];
      for (let guard = 0; guard < n + 4; guard++) {
        const tail = ids[ids.length - 1], list = ends.get(tail);
        let next = -1;
        if (typeof list === "number") { if (!used[list]) next = list; }
        else if (list) for (const idx of list) if (!used[idx]) { next = idx; break; }
        if (next < 0) break;
        used[next] = 1;
        ids.push(segA[next] === tail ? segB[next] : segA[next]);
        if (ids[ids.length - 1] === first) break;
      }
      if (ids.length > 3) {
        const closed = ids[ids.length - 1] === first;
        if (closed) ids.pop();
        loops.push(closed ? orient(ids) : sampled(ids.map(pt)));
      }
    }
    return loops;
  }
  // signed distance in pixels: positive inside the mask, negative outside.
  // Tracing it at iso -r grows the shape by r, at +r it shrinks by r, both smoothly.
  function signedDistanceField(mask, w, h) {
    const inv = new Uint8Array(w * h);
    for (let i = 0; i < inv.length; i++) inv[i] = mask[i] ? 0 : 1;
    const dOut = edt(mask, w, h), dIn = edt(inv, w, h), s = new Float32Array(w * h);
    for (let i = 0; i < s.length; i++) s[i] = mask[i] ? dIn[i] : -dOut[i];
    return s;
  }
  // field (pixels, y down) -> polygons in millimetres, centred on the field
  function fieldToPolys(f, w, h, o) {
    const s = o.mmPerPx, iso = o.iso ?? 0.5;
    const eps = o.eps ?? s * 0.25, minArea = o.minArea ?? s * s * 4, minSeg = o.minSeg ?? s * 0.35;
    let loops = traceField(f, w, h, iso).map(L => {
      let M = L.map(p => [(p[0] - w / 2) * s, (h / 2 - p[1]) * s]).reverse();
      if (o.smooth) M = chaikin(M, o.smooth);
      M = decimate(M, eps);
      // drop micro-segments: a slicer stutters on a run of 0.01 mm moves
      const out = [M[0]];
      for (let i = 1; i < M.length; i++) {
        const p = M[i], q = out[out.length - 1];
        if (Math.hypot(p[0] - q[0], p[1] - q[1]) >= minSeg) out.push(p);
      }
      return out.length > 3 ? out : M;
    }).filter(L => L.length > 2 && Math.abs(area2(L)) > minArea);
    return loops.length ? groupLoops(loops) : [];
  }
  // separable box blur, applied twice (close to a Gaussian); returns a 0..1 field
  function blurMask(mask, w, h, r) {
    let a = new Float32Array(w * h);
    for (let i = 0; i < a.length; i++) a[i] = mask[i] ? 1 : 0;
    if (!r) return a;
    const tmp = new Float32Array(w * h), n = 2 * r + 1;
    for (let pass = 0; pass < 2; pass++) {
      for (let y = 0; y < h; y++) {
        let acc = 0;
        for (let x = -r; x <= r; x++) acc += a[y * w + Math.min(w - 1, Math.max(0, x))];
        for (let x = 0; x < w; x++) {
          tmp[y * w + x] = acc / n;
          acc += a[y * w + Math.min(w - 1, x + r + 1)] - a[y * w + Math.max(0, x - r)];
        }
      }
      for (let x = 0; x < w; x++) {
        let acc = 0;
        for (let y = -r; y <= r; y++) acc += tmp[Math.min(h - 1, Math.max(0, y)) * w + x];
        for (let y = 0; y < h; y++) {
          a[y * w + x] = acc / n;
          acc += tmp[Math.min(h - 1, y + r + 1) * w + x] - tmp[Math.max(0, y - r) * w + x];
        }
      }
    }
    return a;
  }
  // alpha channel of a canvas as a 0..1 coverage field: the font's own anti-aliasing
  function coverageField(data, w, h) {
    const f = new Float32Array(w * h);
    for (let i = 0; i < f.length; i++) f[i] = data[i * 4 + 3] / 255;
    return f;
  }

  // ---------- perspective correction ----------
  // Solve the 3x3 homography H (h33 = 1) that maps each point a[i] onto b[i], for four pairs.
  function homography(a, b) {
    const M = [], v = [];
    for (let i = 0; i < 4; i++) {
      const [x, y] = a[i], [u, w] = b[i];
      M.push([x, y, 1, 0, 0, 0, -u * x, -u * y]); v.push(u);
      M.push([0, 0, 0, x, y, 1, -w * x, -w * y]); v.push(w);
    }
    // Gaussian elimination with partial pivoting
    for (let c = 0; c < 8; c++) {
      let piv = c;
      for (let r = c + 1; r < 8; r++) if (Math.abs(M[r][c]) > Math.abs(M[piv][c])) piv = r;
      if (Math.abs(M[piv][c]) < 1e-12) return null;
      [M[c], M[piv]] = [M[piv], M[c]]; [v[c], v[piv]] = [v[piv], v[c]];
      for (let r = 0; r < 8; r++) {
        if (r === c) continue;
        const f = M[r][c] / M[c][c];
        for (let k = c; k < 8; k++) M[r][k] -= f * M[c][k];
        v[r] -= f * v[c];
      }
    }
    const h = v.map((val, i) => val / M[i][i]);
    return [h[0], h[1], h[2], h[3], h[4], h[5], h[6], h[7], 1];
  }
  function applyH(H, x, y) {
    const d = H[6] * x + H[7] * y + H[8];
    return [(H[0] * x + H[1] * y + H[2]) / d, (H[3] * x + H[4] * y + H[5]) / d];
  }
  // Warp an RGBA image so the quad (tl, tr, br, bl) becomes an outW x outH rectangle (bilinear).
  function warpQuad(data, w, h, quad, outW, outH) {
    const Hm = homography([[0, 0], [outW, 0], [outW, outH], [0, outH]], quad);
    if (!Hm) return null;
    const out = new Uint8ClampedArray(outW * outH * 4);
    for (let y = 0; y < outH; y++) for (let x = 0; x < outW; x++) {
      const [sx, sy] = applyH(Hm, x + 0.5, y + 0.5);
      const fx = sx - 0.5, fy = sy - 0.5, x0 = Math.floor(fx), y0 = Math.floor(fy), tx = fx - x0, ty = fy - y0;
      const o = (y * outW + x) * 4;
      for (let k = 0; k < 4; k++) {
        const s = (xx, yy) => data[(Math.min(h - 1, Math.max(0, yy)) * w + Math.min(w - 1, Math.max(0, xx))) * 4 + k];
        out[o + k] = (s(x0, y0) * (1 - tx) + s(x0 + 1, y0) * tx) * (1 - ty) + (s(x0, y0 + 1) * (1 - tx) + s(x0 + 1, y0 + 1) * tx) * ty;
      }
    }
    return out;
  }
  // Corners of the biggest roughly rectangular blob in a mask (a sheet of paper): extremes of x+y and x-y.
  function quadCorners(mask, w, h) {
    let tl = null, br = null, tr = null, bl = null, a = Infinity, b = -Infinity, c = -Infinity, d = Infinity;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (!mask[y * w + x]) continue;
      const s = x + y, t = x - y;
      if (s < a) { a = s; tl = [x, y]; }
      if (s > b) { b = s; br = [x + 1, y + 1]; }
      if (t > c) { c = t; tr = [x + 1, y]; }
      if (t < d) { d = t; bl = [x, y + 1]; }
    }
    return tl ? [tl, tr, br, bl] : null;
  }

  // Refine rough sheet corners to sub-pixel accuracy: trace the sheet's outline sub-pixel, give each
  // outline point to the nearest edge (skipping the rounded-off corner regions), fit a straight line to
  // each edge by total least squares, and intersect neighbouring lines.
  function refineQuad(mask, w, h, quad) {
    const loops = traceField(blurMask(mask, w, h, 1), w, h, 0.5);
    if (!loops.length) return quad;
    const outline = loops.reduce((a, b) => (Math.abs(area2(b)) > Math.abs(area2(a)) ? b : a));
    const diag = Math.hypot(w, h), edges = [[], [], [], []];
    for (const p of outline) {
      let best = -1, bd = Infinity, bt = 0;
      for (let e = 0; e < 4; e++) {
        const a = quad[e], b = quad[(e + 1) % 4], dx = b[0] - a[0], dy = b[1] - a[1], L2 = dx * dx + dy * dy || 1;
        const t = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / L2;
        const qx = a[0] + dx * t, qy = a[1] + dy * t, d = Math.hypot(p[0] - qx, p[1] - qy);
        if (d < bd) { bd = d; best = e; bt = t; }
      }
      if (best >= 0 && bt > 0.08 && bt < 0.92 && bd < diag * 0.03) edges[best].push(p);
    }
    const lines = edges.map(pts => {
      if (pts.length < 6) return null;
      let mx = 0, my = 0; pts.forEach(p => { mx += p[0]; my += p[1]; }); mx /= pts.length; my /= pts.length;
      let sxx = 0, sxy = 0, syy = 0;
      pts.forEach(p => { const x = p[0] - mx, y = p[1] - my; sxx += x * x; sxy += x * y; syy += y * y; });
      const ang = 0.5 * Math.atan2(2 * sxy, sxx - syy);            // direction of largest spread
      return { p: [mx, my], d: [Math.cos(ang), Math.sin(ang)] };
    });
    if (lines.some(l => !l)) return quad;
    const meet = (A, B) => {
      const den = A.d[0] * B.d[1] - A.d[1] * B.d[0];
      if (Math.abs(den) < 1e-9) return null;
      const t = ((B.p[0] - A.p[0]) * B.d[1] - (B.p[1] - A.p[1]) * B.d[0]) / den;
      return [A.p[0] + A.d[0] * t, A.p[1] + A.d[1] * t];
    };
    // corner i sits where edge i-1 (arriving) meets edge i (leaving)
    const out = [0, 1, 2, 3].map(i => meet(lines[(i + 3) % 4], lines[i]));
    if (out.some(c => !c || Math.hypot(c[0] - quad[out.indexOf(c)][0], c[1] - quad[out.indexOf(c)][1]) > diag * 0.05)) return quad;
    return out;
  }

  // ---------- edge-to-edge size of a traced outline ----------
  // A bounding box is set by the few outermost points, so jagged or noisy edges inflate it.
  // This measures the way calipers do: find the outline's own axes (minimum-area rectangle),
  // fit a straight line to each flat side (total least squares over points sampled evenly by
  // arc length, corners skipped), and measure between opposite lines. A side that is not
  // straight falls back to its outermost point. res is the tracing resolution in outline units
  // per pixel; it sets how far an edge may wander and still count as one straight side.
  function convexHull(pts) {
    const P = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    if (P.length < 3) return P;
    const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
    const lo = [], hi = [];
    for (const p of P) { while (lo.length >= 2 && cross(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); }
    for (let i = P.length - 1; i >= 0; i--) { const p = P[i]; while (hi.length >= 2 && cross(hi[hi.length - 2], hi[hi.length - 1], p) <= 0) hi.pop(); hi.push(p); }
    return lo.slice(0, -1).concat(hi.slice(0, -1));
  }
  function fitDimensions(ring, opts) {
    const o = opts || {}, res = o.res || 1;
    if (!ring || ring.length < 3) return null;
    let bx0 = Infinity, bx1 = -Infinity, by0 = Infinity, by1 = -Infinity;
    ring.forEach(([x, y]) => { bx0 = Math.min(bx0, x); bx1 = Math.max(bx1, x); by0 = Math.min(by0, y); by1 = Math.max(by1, y); });
    const bbox = { width: bx1 - bx0, height: by1 - by0 };
    // samples evenly spaced along the outline, each with its local direction
    const step = Math.max(res * 0.25, Math.hypot(bbox.width, bbox.height) / 4000), S = [];
    for (let i = 0; i < ring.length; i++) {
      const a = ring[i], b = ring[(i + 1) % ring.length], L = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (L < 1e-12) continue;
      const n = Math.max(1, Math.ceil(L / step)), dx = (b[0] - a[0]) / L, dy = (b[1] - a[1]) / L;
      for (let k = 0; k < n; k++) { const t = (k + 0.5) / n; S.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, dx, dy, L / n]); }
    }
    // minimum-area rectangle: one side lies along a convex-hull edge. Keep the angle within
    // +-45 degrees so "width" stays the direction nearest the picture's horizontal.
    const hull = convexHull(ring);
    let best = null;
    for (let i = 0; i < hull.length; i++) {
      const a = hull[i], b = hull[(i + 1) % hull.length];
      let ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
      ang = ang - Math.round(ang / (Math.PI / 2)) * (Math.PI / 2);
      const c = Math.cos(ang), s = Math.sin(ang);
      let u0 = Infinity, u1 = -Infinity, v0 = Infinity, v1 = -Infinity;
      for (const p of hull) { const u = p[0] * c + p[1] * s, v = -p[0] * s + p[1] * c; u0 = Math.min(u0, u); u1 = Math.max(u1, u); v0 = Math.min(v0, v); v1 = Math.max(v1, v); }
      const A = (u1 - u0) * (v1 - v0);
      if (!best || A < best.A - 1e-9) best = { A, ang };
    }
    const measure = ang => {
      const c = Math.cos(ang), s = Math.sin(ang);
      const Q = S.map(([x, y, dx, dy, wt]) => [x * c + y * s, -x * s + y * c, dx * c + dy * s, -dx * s + dy * c, wt]);
      let u0 = Infinity, u1 = -Infinity, v0 = Infinity, v1 = -Infinity;
      Q.forEach(q => { u0 = Math.min(u0, q[0]); u1 = Math.max(u1, q[0]); v0 = Math.min(v0, q[1]); v1 = Math.max(v1, q[1]); });
      const band0 = Math.max(res * 4, 0.01 * Math.max(u1 - u0, v1 - v0));
      // side: axis 0 = left/right (constant u), 1 = bottom/top (constant v); sign -1 = low side
      const side = (axis, sign) => {
        const ext = axis === 0 ? (sign < 0 ? u0 : u1) : (sign < 0 ? v0 : v1);
        const along = axis === 0 ? [v0, v1] : [u0, u1], len = along[1] - along[0], trim = len * 0.08;
        const pick = (near) => Q.filter(q => {
          const n = axis === 0 ? q[0] : q[1], t = axis === 0 ? q[1] : q[0], dn = axis === 0 ? q[2] : q[3];
          return near(n, t) && t > along[0] + trim && t < along[1] - trim && Math.abs(dn) < 0.5;   // running along the side
        });
        const fit = pts => {                                  // weighted TLS line, in (along, normal) coordinates
          let W = 0, mt = 0, mn = 0;
          pts.forEach(q => { const t = axis === 0 ? q[1] : q[0], n = axis === 0 ? q[0] : q[1]; W += q[4]; mt += q[4] * t; mn += q[4] * n; });
          mt /= W; mn /= W;
          let stt = 0, stn = 0, snn = 0;
          pts.forEach(q => { const t = (axis === 0 ? q[1] : q[0]) - mt, n = (axis === 0 ? q[0] : q[1]) - mn; stt += q[4] * t * t; stn += q[4] * t * n; snn += q[4] * n * n; });
          const th = 0.5 * Math.atan2(2 * stn, stt - snn), slope = Math.abs(Math.cos(th)) > 1e-9 ? Math.tan(th) : 0;
          let r2 = 0; pts.forEach(q => { const t = axis === 0 ? q[1] : q[0], n = axis === 0 ? q[0] : q[1], e = (n - mn - slope * (t - mt)) * Math.cos(th); r2 += q[4] * e * e; });
          return { mt, mn, slope, rms: Math.sqrt(r2 / W), W };
        };
        let pts = pick(n => Math.abs(n - ext) <= band0);
        let span = 0, line = null;
        for (let it = 0; it < 3 && pts.length >= 8; it++) {
          line = fit(pts);
          const tol = Math.max(res * 1.5, line.rms * 3);
          pts = pick((n, t) => Math.abs(n - (line.mn + line.slope * (t - line.mt))) <= tol);
        }
        if (pts.length >= 8) {
          line = fit(pts);
          let t0 = Infinity, t1 = -Infinity; pts.forEach(q => { const t = axis === 0 ? q[1] : q[0]; t0 = Math.min(t0, t); t1 = Math.max(t1, t); });
          let cov = 0; pts.forEach(q => { cov += q[4]; });
          span = Math.min(t1 - t0, cov);
        }
        // a flat side leaves no bow: fit n = a + b t + c t^2 and measure the sag over the fitted span
        let sag = Infinity;
        if (line) {
          let s0 = 0, s1 = 0, s2 = 0, s3 = 0, s4 = 0, r0 = 0, r1 = 0, r2 = 0;
          pts.forEach(q => { const t = (axis === 0 ? q[1] : q[0]) - line.mt, n = (axis === 0 ? q[0] : q[1]) - line.mn, wt = q[4];
            s0 += wt; s1 += wt * t; s2 += wt * t * t; s3 += wt * t * t * t; s4 += wt * t * t * t * t; r0 += wt * n; r1 += wt * n * t; r2 += wt * n * t * t; });
          const det3 = (a, b, c, d, e, f, g, h, i) => a * (e * i - f * h) - b * (d * i - f * g) + c * (d * h - e * g);
          const D = det3(s0, s1, s2, s1, s2, s3, s2, s3, s4);
          if (Math.abs(D) > 1e-18) { const cc = det3(s0, s1, r0, s1, s2, r1, s2, s3, r2) / D; sag = Math.abs(cc) * span * span / 4; }
        }
        const straight = !!line && pts.length >= 8 && span >= len * 0.25 && Math.abs(line.slope) < 0.05 && sag <= Math.max(res * 0.5, len * 0.0015);
        if (o.debug) o.debug.push({ axis, sign, n: pts.length, span: +span.toFixed(2), len: +len.toFixed(2), rms: line && +line.rms.toFixed(4), sag: +sag.toFixed(4), straight });
        return { straight, ext, line: straight ? line : null, span };
      };
      const across = (lo, hi, mid) => {
        if (!lo.straight || !hi.straight) {
          const a = lo.straight ? lo.line.mn + lo.line.slope * (mid - lo.line.mt) : lo.ext;
          const b = hi.straight ? hi.line.mn + hi.line.slope * (mid - hi.line.mt) : hi.ext;
          return b - a;
        }
        // average the gap measured at each fitted side's own centre, corrected for tilt
        const at = (L, t) => L.mn + L.slope * (t - L.mt);
        const g1 = at(hi.line, lo.line.mt) - lo.line.mn, g2 = hi.line.mn - at(lo.line, hi.line.mt);
        const sl = (lo.line.slope + hi.line.slope) / 2;
        return ((g1 + g2) / 2) / Math.sqrt(1 + sl * sl);
      };
      const L = side(0, -1), R = side(0, 1), B = side(1, -1), T = side(1, 1);
      return { width: across(L, R, (v0 + v1) / 2), height: across(B, T, (u0 + u1) / 2), sides: { left: L.straight, right: R.straight, bottom: B.straight, top: T.straight },
        extentW: u1 - u0, extentH: v1 - v0 };
    };
    let m = measure(best ? best.ang : 0), ang = best ? best.ang : 0;
    const anyFlat = s => s.left || s.right || s.bottom || s.top;
    if (!anyFlat(m.sides) && ang !== 0) { m = measure(0); ang = 0; }      // nothing straight: keep the picture's axes
    return { width: m.width, height: m.height, angle: ang * 180 / Math.PI, sides: m.sides,
      fittedW: m.sides.left && m.sides.right, fittedH: m.sides.bottom && m.sides.top,
      extentW: m.extentW, extentH: m.extentH, bboxW: bbox.width, bboxH: bbox.height };
  }

  // ---------- CAD outlines ----------
  // polygons in mm -> an SVG a CAD program or laser cutter will open at true size
  function outlineSVG(polys, title) {
    let mnx = Infinity, mny = Infinity, mxx = -Infinity, mxy = -Infinity;
    polys.forEach(p => [p.outer, ...p.holes].forEach(L => L.forEach(([x, y]) => {
      mnx = Math.min(mnx, x); mxx = Math.max(mxx, x); mny = Math.min(mny, y); mxy = Math.max(mxy, y);
    })));
    const W = mxx - mnx, H = mxy - mny;
    const path = L => "M" + L.map(([x, y]) => f(x - mnx) + " " + f(mxy - y)).join("L") + "Z";
    const body = polys.map(p => '<path d="' + [p.outer, ...p.holes].map(path).join(" ") + '"/>').join("\n  ");
    return '<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="' + f(W) + 'mm" height="' + f(H) +
      'mm" viewBox="0 0 ' + f(W) + " " + f(H) + '">\n <title>' + esc(title || "outline") + '</title>\n <g fill="none" stroke="#000" stroke-width="0.1" fill-rule="evenodd">\n  ' +
      body + "\n </g>\n</svg>\n";
  }
  // polygons in mm -> a minimal ASCII DXF (closed POLYLINEs), which every CAD program imports
  function outlineDXF(polys) {
    const L = ["0", "SECTION", "2", "HEADER", "9", "$INSUNITS", "70", "4", "0", "ENDSEC", "0", "SECTION", "2", "ENTITIES"];
    const loop = pts => {
      L.push("0", "POLYLINE", "8", "OUTLINE", "66", "1", "70", "1");
      pts.forEach(([x, y]) => L.push("0", "VERTEX", "8", "OUTLINE", "10", f(x), "20", f(y), "30", "0"));
      L.push("0", "SEQEND", "8", "OUTLINE");
    };
    polys.forEach(p => { loop(p.outer); p.holes.forEach(loop); });
    L.push("0", "ENDSEC", "0", "EOF");
    return L.join("\r\n") + "\r\n";
  }

  // ---------- plastic canvas: a sheet perforated with a grid of square holes ----------
  function transformSolid(s, scale, dx, dy, dz) {
    if (!s) return null;
    const p = new Float32Array(s.pos.length);
    for (let i = 0; i < p.length; i += 3) {
      p[i] = s.pos[i] * scale + (dx || 0);
      p[i + 1] = s.pos[i + 1] * scale + (dy || 0);
      p[i + 2] = s.pos[i + 2] * scale + (dz || 0);
    }
    return { pos: p, idx: s.idx };
  }
  // mirror across the YZ plane; winding is reversed so the solid stays outward facing
  function mirrorSolid(s) {
    if (!s) return null;
    const p = new Float32Array(s.pos), idx = new Uint32Array(s.idx);
    for (let i = 0; i < p.length; i += 3) p[i] = -p[i];
    for (let i = 0; i < idx.length; i += 3) { const t = idx[i + 1]; idx[i + 1] = idx[i + 2]; idx[i + 2] = t; }
    return { pos: p, idx };
  }
  function solidBounds(s) {
    const mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity];
    for (let i = 0; i < s.pos.length; i += 3) for (let k = 0; k < 3; k++) {
      const v = s.pos[i + k]; if (v < mn[k]) mn[k] = v; if (v > mx[k]) mx[k] = v;
    }
    return { mn, mx, size: [mx[0] - mn[0], mx[1] - mn[1], mx[2] - mn[2]] };
  }
  function mirrorMaskX(mask, w, h) {
    const out = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) out[y * w + x] = mask[y * w + (w - 1 - x)];
    return out;
  }
  function insideRing(ring) {
    return (x, y) => {
      let hit = false;
      for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        const a = ring[i], b = ring[j];
        if ((a[1] > y) !== (b[1] > y) && x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]) hit = !hit;
      }
      return hit;
    };
  }
  function perforate(outer, pitch, bar) {
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const p of outer) { minX = Math.min(minX, p[0]); maxX = Math.max(maxX, p[0]); minY = Math.min(minY, p[1]); maxY = Math.max(maxY, p[1]); }
    const inside = insideRing(outer), hole = Math.max(0.4, pitch - bar), holes = [];
    const nx = Math.max(1, Math.floor((maxX - minX - bar) / pitch)), ny = Math.max(1, Math.floor((maxY - minY - bar) / pitch));
    const x0 = (minX + maxX) / 2 - (nx - 1) * pitch / 2, y0 = (minY + maxY) / 2 - (ny - 1) * pitch / 2;
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
      const cx = x0 + i * pitch, cy = y0 + j * pitch, h = hole / 2, m = h + bar * 0.5;
      if (!inside(cx - m, cy - m) || !inside(cx + m, cy - m) || !inside(cx + m, cy + m) || !inside(cx - m, cy + m)) continue;
      holes.push([[cx - h, cy - h], [cx + h, cy - h], [cx + h, cy + h], [cx - h, cy + h]]);
    }
    return { holes, nx, ny, pitch, x0, y0 };
  }

  // ---------- pixel / mosaic snapping (cross stitch squares) ----------
  function snapToGrid(cm, cells) {
    const { gx, gy, idx } = cm, out = new Int8Array(idx.length);
    const step = Math.max(1, Math.round(gx / Math.max(2, cells)));
    for (let by = 0; by < gy; by += step) for (let bx = 0; bx < gx; bx += step) {
      const tally = new Map();
      for (let y = by; y < Math.min(gy, by + step); y++) for (let x = bx; x < Math.min(gx, bx + step); x++) {
        const v = idx[y * gx + x]; tally.set(v, (tally.get(v) || 0) + 1);
      }
      let best = -1, bc = -1;
      for (const [v, n] of tally) if (n > bc) { bc = n; best = v; }
      for (let y = by; y < Math.min(gy, by + step); y++) for (let x = bx; x < Math.min(gx, bx + step); x++) out[y * gx + x] = best;
    }
    return { gx, gy, idx: out, lum: cm.lum, cell: step };
  }

  // 2D frame is (x, -z) so that (a1, a2, +Y) is right-handed.
  function extrudePolys(polys, thickness) {
    const { pts, tris } = triangulate(polys, 0);
    return solidFromTris(pts, tris, p => [p[0], thickness, -p[1]], p => [p[0], 0, -p[1]]);
  }
  function ringCircle(r, segs, cw) {
    const L = []; for (let i = 0; i < segs; i++) { const a = (cw ? -i : i) / segs * Math.PI * 2; L.push([Math.cos(a) * r, Math.sin(a) * r]); } return L;
  }
  function ringRect(w, h, r, segs) {
    r = Math.max(0, Math.min(r, Math.min(w, h) / 2 - 0.01));
    const hw = w / 2 - r, hh = h / 2 - r, L = [];
    const corner = (cx, cy, a0) => { for (let i = 0; i <= segs; i++) { const a = a0 + (i / segs) * Math.PI / 2; L.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); } };
    if (r <= 0.01) return [[hw, -hh], [hw, hh], [-hw, hh], [-hw, -hh]];
    corner(hw, -hh, -Math.PI / 2); corner(hw, hh, 0); corner(-hw, hh, Math.PI / 2); corner(-hw, -hh, Math.PI);
    return L;
  }
  function ringStar(points, R, r) {
    const L = []; for (let i = 0; i < points * 2; i++) { const a = Math.PI / 2 + i * Math.PI / points, rad = i % 2 ? r : R; L.push([Math.cos(a) * rad, Math.sin(a) * rad]); } return L;
  }
  function ringPoly(n, R, rot) { const L = []; for (let i = 0; i < n; i++) { const a = (rot || 0) + i / n * Math.PI * 2; L.push([Math.cos(a) * R, Math.sin(a) * R]); } return L; }
  function ringHeart(R, segs) {
    const L = []; for (let i = 0; i < segs; i++) {
      const t = i / segs * Math.PI * 2, x = 16 * Math.sin(t) ** 3;
      const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
      L.push([-x * R / 17, y * R / 17]);
    } return L;
  }
  function mergeSolids(list) {
    list = list.filter(Boolean);
    if (!list.length) return null;
    let vc = 0, ic = 0; list.forEach(m => { vc += m.pos.length; ic += m.idx.length; });
    const pos = new Float32Array(vc), idx = new Uint32Array(ic); let vo = 0, io = 0;
    list.forEach(m => { pos.set(m.pos, vo); for (let i = 0; i < m.idx.length; i++) idx[io + i] = m.idx[i] + vo / 3; vo += m.pos.length; io += m.idx.length; });
    return { pos, idx };
  }

  // dilate then erode: joins letters that nearly touch
  function closeMask(mask, w, h, r) { return r <= 0 ? Uint8Array.from(mask) : erodeMask(dilateMask(mask, w, h, r), w, h, r); }
  // Smoothing that tells noise from features. A close then an open with a disc of radius r rounds
  // corners, fills nicks and pinholes and removes specks and short whiskers, but on its own it also
  // deletes every stroke thinner than 2r and fills every gap narrower than 2r: a brush-stroke ring
  // that thins out at one end falls apart, and small letters merge. Here each piece the close adds
  // and the open removes is judged by its length: its farthest point from what remains, capped by
  // its own size (so a lone speck is short however far it is from anything). Pieces longer than r + 1
  // are features (a thin stretch of a ring, a hairline, the gap between two letters, a slot) and are
  // put back as they were; the rest is noise and stays smoothed.
  function smoothMask(mask, w, h, r) {
    const n = w * h;
    if (!(r > 0)) return Uint8Array.from(mask);
    const long = r + 1;
    // pieces of `diff` whose length (farthest distance in `dist`, capped by the diagonal) exceeds long
    const longPieces = (diff, dist) => {
      const { lab, comps } = labelMask(diff, w, h);
      if (!comps.length) return null;
      const far = new Float64Array(comps.length);
      for (let i = 0; i < n; i++) if (lab[i] >= 0 && dist[i] > far[lab[i]]) far[lab[i]] = dist[i];
      const keep = comps.map(c => Math.min(far[c.id], Math.hypot(c.maxX - c.minX + 1, c.maxY - c.minY + 1)) > long);
      return keep.some(Boolean) ? { lab, keep } : null;
    };
    const closed = closeMask(mask, w, h, r), added = new Uint8Array(n), bg = new Uint8Array(n);
    for (let i = 0; i < n; i++) { added[i] = closed[i] && !mask[i] ? 1 : 0; bg[i] = closed[i] ? 0 : 1; }
    const gaps = longPieces(added, edt(bg, w, h));               // distance to the background still open
    if (gaps) for (let i = 0; i < n; i++) if (gaps.lab[i] >= 0 && gaps.keep[gaps.lab[i]]) closed[i] = 0;
    const opened = dilateMask(erodeMask(closed, w, h, r), w, h, r), removed = new Uint8Array(n);
    for (let i = 0; i < n; i++) removed[i] = closed[i] && !opened[i] ? 1 : 0;
    const strokes = longPieces(removed, edt(opened, w, h));      // distance to the smoothed shape
    if (strokes) for (let i = 0; i < n; i++) if (strokes.lab[i] >= 0 && strokes.keep[strokes.lab[i]]) opened[i] = 1;
    return opened;
  }

  // ---------- printability ----------
  // All of this works in the print frame: Y up, the bed at y = 0, millimetres.
  // m is a 3x3 matrix in row order, t a translation; a mirror (det < 0) flips the winding back.
  function affineSolid(s, m, t) {
    if (!s) return null;
    const P = s.pos, p = new Float32Array(P.length), tx = t ? t[0] : 0, ty = t ? t[1] : 0, tz = t ? t[2] : 0;
    for (let i = 0; i < P.length; i += 3) {
      const x = P[i], y = P[i + 1], z = P[i + 2];
      p[i] = m[0] * x + m[1] * y + m[2] * z + tx;
      p[i + 1] = m[3] * x + m[4] * y + m[5] * z + ty;
      p[i + 2] = m[6] * x + m[7] * y + m[8] * z + tz;
    }
    const det = m[0] * (m[4] * m[8] - m[5] * m[7]) - m[1] * (m[3] * m[8] - m[5] * m[6]) + m[2] * (m[3] * m[7] - m[4] * m[6]);
    let idx = s.idx;
    if (det < 0) { idx = new Uint32Array(s.idx); for (let i = 0; i < idx.length; i += 3) { const k = idx[i + 1]; idx[i + 1] = idx[i + 2]; idx[i + 2] = k; } }
    return { pos: p, idx };
  }
  function mat3Mul(a, b) {
    const o = new Array(9);
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) o[r * 3 + c] = a[r * 3] * b[c] + a[r * 3 + 1] * b[3 + c] + a[r * 3 + 2] * b[6 + c];
    return o;
  }
  // the rotation that turns direction d (unit) to straight down, by the shortest turn
  function rotationDownTo(d) {
    const L = Math.hypot(d[0], d[1], d[2]) || 1, a = [d[0] / L, d[1] / L, d[2] / L];
    const c = -a[1];                                     // a . (0,-1,0)
    if (c > 1 - 1e-9) return [1, 0, 0, 0, 1, 0, 0, 0, 1];
    if (c < -1 + 1e-9) return [1, 0, 0, 0, -1, 0, 0, 0, -1];   // upside down: half a turn about X
    const v = [a[2], 0, -a[0]], k = 1 / (1 + c);          // a x (0,-1,0)
    return [1 - k * v[2] * v[2], -v[2], k * v[0] * v[2],
      v[2], 1 - k * (v[0] * v[0] + v[2] * v[2]), -v[0],
      k * v[0] * v[2], v[0], 1 - k * v[0] * v[0]];
  }
  // triangle soup for analysis: 9 coordinates, a unit normal and an area per triangle
  function flattenParts(parts) {
    let T = 0; parts.forEach(p => { T += p.idx.length / 3; });
    const V = new Float64Array(T * 9), N = new Float64Array(T * 3), A = new Float64Array(T);
    const part = new Int32Array(T), start = [], mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity];
    let t = 0;
    parts.forEach((p, pi) => {
      start.push(t);
      const P = p.pos, I = p.idx;
      for (let i = 0; i < I.length; i += 3, t++) {
        for (let k = 0; k < 3; k++) {
          const v = I[i + k] * 3;
          for (let j = 0; j < 3; j++) { const q = P[v + j]; V[t * 9 + k * 3 + j] = q; if (q < mn[j]) mn[j] = q; if (q > mx[j]) mx[j] = q; }
        }
        const o = t * 9, ux = V[o + 3] - V[o], uy = V[o + 4] - V[o + 1], uz = V[o + 5] - V[o + 2];
        const wx = V[o + 6] - V[o], wy = V[o + 7] - V[o + 1], wz = V[o + 8] - V[o + 2];
        const nx = uy * wz - uz * wy, ny = uz * wx - ux * wz, nz = ux * wy - uy * wx, l = Math.hypot(nx, ny, nz);
        A[t] = l / 2; part[t] = pi;
        if (l > 0) { N[t * 3] = nx / l; N[t * 3 + 1] = ny / l; N[t * 3 + 2] = nz / l; }
      }
    });
    start.push(t);
    return { V, N, A, part, start, T, mn, mx, nParts: parts.length };
  }
  // XZ bucket grid over every face that is not vertical, for "what is directly below this point"
  function makeRayGrid(F) {
    const ex = Math.max(1e-6, F.mx[0] - F.mn[0]), ez = Math.max(1e-6, F.mx[2] - F.mn[2]);
    const cell = Math.max(0.25, Math.sqrt(ex * ez / Math.max(1, F.T)) * 1.5, Math.max(ex, ez) / 256);
    const gw = Math.floor(ex / cell) + 1, gh = Math.floor(ez / cell) + 1, x0 = F.mn[0], z0 = F.mn[2];
    const cnt = new Int32Array(gw * gh + 1), V = F.V;
    const span = (t, f) => {
      const o = t * 9;
      const a = Math.floor((Math.min(V[o], V[o + 3], V[o + 6]) - x0) / cell), b = Math.floor((Math.max(V[o], V[o + 3], V[o + 6]) - x0) / cell);
      const c = Math.floor((Math.min(V[o + 2], V[o + 5], V[o + 8]) - z0) / cell), d = Math.floor((Math.max(V[o + 2], V[o + 5], V[o + 8]) - z0) / cell);
      for (let j = Math.max(0, c); j <= Math.min(gh - 1, d); j++) for (let i = Math.max(0, a); i <= Math.min(gw - 1, b); i++) f(j * gw + i);
    };
    for (let t = 0; t < F.T; t++) if (Math.abs(F.N[t * 3 + 1]) > 1e-6) span(t, c => cnt[c + 1]++);
    for (let i = 0; i < gw * gh; i++) cnt[i + 1] += cnt[i];
    const list = new Int32Array(cnt[gw * gh]), fill = Int32Array.from(cnt);
    for (let t = 0; t < F.T; t++) if (Math.abs(F.N[t * 3 + 1]) > 1e-6) span(t, c => { list[fill[c]++] = t; });
    return { cell, gw, gh, x0, z0, cnt, list };
  }
  // What is directly below (x, yTop, z)? Parts may overlap (an inlay sunk into a plate, a colour cap
  // sunk into raised letters), so each part is looked at on its own: if a part's nearest face below
  // points down, the point is inside that part and held up by it. Otherwise the highest face that
  // points up, in any part, is what the point would rest on.
  const nearY = [], nearUp = [];
  function surfaceBelow(F, G, x, z, yTop, skip) {
    const i = Math.floor((x - G.x0) / G.cell), j = Math.floor((z - G.z0) / G.cell);
    if (i < 0 || j < 0 || i >= G.gw || j >= G.gh) return { inside: false, up: -Infinity };
    const V = F.V, c = j * G.gw + i;
    for (let p = 0; p < F.nParts; p++) { nearY[p] = -Infinity; nearUp[p] = true; }
    let up = -Infinity;
    for (let k = G.cnt[c]; k < G.cnt[c + 1]; k++) {
      const t = G.list[k]; if (t === skip) continue;
      const o = t * 9, x0 = V[o], z0 = V[o + 2], x1 = V[o + 3], z1 = V[o + 5], x2 = V[o + 6], z2 = V[o + 8];
      const d = (z1 - z2) * (x0 - x2) + (x2 - x1) * (z0 - z2);
      if (Math.abs(d) < 1e-12) continue;
      const l0 = ((z1 - z2) * (x - x2) + (x2 - x1) * (z - z2)) / d, l1 = ((z2 - z0) * (x - x2) + (x0 - x2) * (z - z2)) / d, l2 = 1 - l0 - l1;
      if (l0 < -1e-9 || l1 < -1e-9 || l2 < -1e-9) continue;
      const y = l0 * V[o + 1] + l1 * V[o + 4] + l2 * V[o + 7], isUp = F.N[t * 3 + 1] > 0, p = F.part[t];
      // a face pointing down only means "inside" when strictly below: a coplanar neighbour of the
      // same flat face, or another part's bottom at the same height, is not
      if (y > yTop + (isUp ? 1e-3 : -1e-3)) continue;
      if (isUp && y > up) up = y;
      if (y > nearY[p] + 1e-6 || (y > nearY[p] - 1e-6 && isUp)) { nearY[p] = y; nearUp[p] = isUp; }
    }
    let inside = false;
    for (let p = 0; p < F.nParts; p++) if (nearY[p] > -Infinity && !nearUp[p]) { inside = true; break; }
    return { inside, up };
  }
  // is the point held up by the bed, a surface just below, or the inside of another part?
  function supported(F, G, x, y, z, skip, tol, bedTol) {
    if (y <= (bedTol ?? tol)) return true;           // anything within the first layer is squashed onto the bed
    const s = surfaceBelow(F, G, x, z, y, skip);
    return s.inside || y - s.up <= tol;
  }
  // downward faces steeper than the limit, sampled on a small grid across each face
  function overhangScan(F, G, o) {
    // a face exactly at the limit (a 45° teardrop roof) prints fine: allow for rounding in its normal
    const lim = -Math.sin((o.angle ?? 45) * Math.PI / 180) - 1e-4, flat = -0.985, tol = o.tol, step = o.sample || 0.5, kMax = o.kMax || 16;
    const flag = new Uint8Array(F.T), ua = new Float32Array(F.T), V = F.V;
    let area = 0, flatArea = 0, contact = 0;
    const flatTris = [];
    for (let t = 0; t < F.T; t++) {
      const ny = F.N[t * 3 + 1]; if (ny >= lim) continue;
      const o9 = t * 9, ymax = Math.max(V[o9 + 1], V[o9 + 4], V[o9 + 7]);
      if (ymax <= tol) { if (ny < flat) contact += F.A[t]; continue; }
      const k = Math.min(kMax, Math.max(1, Math.ceil(Math.sqrt(F.A[t] * 2) / step)));
      let bad = 0, n = 0;
      const test = (u, v) => {
        const w = 1 - u - v;
        const x = w * V[o9] + u * V[o9 + 3] + v * V[o9 + 6], y = w * V[o9 + 1] + u * V[o9 + 4] + v * V[o9 + 7], z = w * V[o9 + 2] + u * V[o9 + 5] + v * V[o9 + 8];
        n++; if (!supported(F, G, x, y, z, t, tol, o.bedTol)) bad++;
      };
      for (let i = 0; i < k; i++) for (let j = 0; j < k - i; j++) {
        test((i + 1 / 3) / k, (j + 1 / 3) / k);
        if (i + j <= k - 2) test((i + 2 / 3) / k, (j + 2 / 3) / k);
      }
      if (!bad) continue;
      const a = F.A[t] * bad / n; ua[t] = a;
      if (ny < flat) { flatArea += a; flatTris.push(t); } else area += a;
      if (bad * 2 >= n) flag[t] = 1;
    }
    return { area, flatArea, contact, flag, ua, flatTris };
  }
  // Steep overhangs that reach out no further than a small ledge print without support (a decal on
  // a wall, a chamfered lip). How far a region reaches out is the width of its outline seen from
  // above: the red faces are drawn onto an XZ grid and each connected patch is measured.
  function narrowSteep(F, scan, o) {
    const V = F.V, list = [];
    for (let t = 0; t < F.T; t++) if (scan.flag[t] === 1 && F.N[t * 3 + 1] >= -0.985) list.push(t);
    if (!list.length) return 0;
    let mn0 = Infinity, mn2 = Infinity, mx0 = -Infinity, mx2 = -Infinity;
    list.forEach(t => { for (let k = 0; k < 3; k++) { const x = V[t * 9 + k * 3], z = V[t * 9 + k * 3 + 2]; if (x < mn0) mn0 = x; if (x > mx0) mx0 = x; if (z < mn2) mn2 = z; if (z > mx2) mx2 = z; } });
    const c = Math.max(0.1, Math.max(mx0 - mn0, mx2 - mn2) / 600), g = gridOver(mn0, mn2, mx0, mx2, c, 3);
    const M = new Uint8Array(g.w * g.h), home = new Int32Array(list.length).fill(-1);
    list.forEach((t, n) => {
      const o9 = t * 9, x0 = V[o9], z0 = V[o9 + 2], x1 = V[o9 + 3], z1 = V[o9 + 5], x2 = V[o9 + 6], z2 = V[o9 + 8];
      const d = (z1 - z2) * (x0 - x2) + (x2 - x1) * (z0 - z2);
      // the cell under the face's centre always belongs to it, even for a sliver thinner than a cell
      const cx = (x0 + x1 + x2) / 3, cz = (z0 + z1 + z2) / 3, ci = Math.floor((cx - g.x0) / c), cj = Math.floor((cz - g.z0) / c);
      home[n] = cj * g.w + ci; M[home[n]] = 1;
      if (Math.abs(d) < 1e-12) return;
      const i0 = Math.max(0, Math.floor((Math.min(x0, x1, x2) - g.x0) / c)), i1 = Math.min(g.w - 1, Math.ceil((Math.max(x0, x1, x2) - g.x0) / c));
      const j0 = Math.max(0, Math.floor((Math.min(z0, z1, z2) - g.z0) / c)), j1 = Math.min(g.h - 1, Math.ceil((Math.max(z0, z1, z2) - g.z0) / c));
      for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
        const x = g.x0 + (i + 0.5) * c, z = g.z0 + (j + 0.5) * c;
        const l0 = ((z1 - z2) * (x - x2) + (x2 - x1) * (z - z2)) / d, l1 = ((z2 - z0) * (x - x2) + (x0 - x2) * (z - z2)) / d;
        if (l0 >= -1e-9 && l1 >= -1e-9 && l0 + l1 <= 1 + 1e-9) M[j * g.w + i] = 1;
      }
    });
    const lab = labelMask(M, g.w, g.h), inv = new Uint8Array(M.length);
    for (let i = 0; i < M.length; i++) inv[i] = M[i] ? 0 : 1;
    const din = edt(inv, g.w, g.h), deep = new Float64Array(lab.comps.length);
    for (let i = 0; i < M.length; i++) if (M[i] && din[i] > deep[lab.lab[i]]) deep[lab.lab[i]] = din[i];
    let freed = 0;
    list.forEach((t, n) => {
      const id = lab.lab[home[n]];
      if (id >= 0 && Math.max(c, (2 * deep[id] - 0.5) * c) <= o.ledge) { scan.flag[t] = 2; freed += scan.ua[t]; }
    });
    return freed;
  }
  // cross-section at height y as a mask on grid g = { x0, z0, c, w, h }: cell (i, j) has its
  // centre at (x0 + (i + .5) c, z0 + (j + .5) c). Each part is filled even-odd, then parts are ORed.
  // triangles bucketed by height, built once per soup, so a slice only visits faces that can cross it
  function heightIndex(F) {
    if (F.yIndex) return F.yIndex;
    const V = F.V, lo = F.mn[1], n = Math.max(1, Math.min(1024, Math.ceil(F.T / 64))), step = Math.max(1e-6, (F.mx[1] - lo) / n);
    const cnt = new Int32Array(n + 1), b0 = new Int32Array(F.T), b1 = new Int32Array(F.T);
    for (let t = 0; t < F.T; t++) {
      const o = t * 9, a = Math.min(V[o + 1], V[o + 4], V[o + 7]), b = Math.max(V[o + 1], V[o + 4], V[o + 7]);
      b0[t] = Math.max(0, Math.min(n - 1, Math.floor((a - lo) / step))); b1[t] = Math.max(0, Math.min(n - 1, Math.floor((b - lo) / step)));
      for (let k = b0[t]; k <= b1[t]; k++) cnt[k + 1]++;
    }
    for (let k = 0; k < n; k++) cnt[k + 1] += cnt[k];
    const list = new Int32Array(cnt[n]), fill = Int32Array.from(cnt);
    for (let t = 0; t < F.T; t++) for (let k = b0[t]; k <= b1[t]; k++) list[fill[k]++] = t;   // ascending t, so parts stay grouped
    return (F.yIndex = { lo, step, n, cnt, list });
  }
  function sliceMask(F, y, g, onlyPart) {
    const out = new Uint8Array(g.w * g.h), V = F.V, Y = heightIndex(F);
    const bk = Math.floor((y - Y.lo) / Y.step);
    if (bk < 0 || bk >= Y.n) return out;
    const p0 = onlyPart == null ? 0 : onlyPart, p1 = onlyPart == null ? F.nParts : onlyPart + 1;
    for (let p = p0; p < p1; p++) {
      const rows = new Map();
      for (let k = Y.cnt[bk]; k < Y.cnt[bk + 1]; k++) {
        const t = Y.list[k]; if (t < F.start[p]) continue; if (t >= F.start[p + 1]) break;
        const o = t * 9, pts = [];
        for (let e = 0; e < 3; e++) {
          let a = o + e * 3, b = o + ((e + 1) % 3) * 3;
          if ((V[a + 1] >= y) === (V[b + 1] >= y)) continue;
          // always from the lower end: the two triangles sharing this edge then get exactly the same
          // point, so a grid row through it is counted by both or neither (not one: a stray streak)
          if (V[a + 1] > V[b + 1]) { const q = a; a = b; b = q; }
          const s = (y - V[a + 1]) / (V[b + 1] - V[a + 1]);
          pts.push(V[a] + (V[b] - V[a]) * s, V[a + 2] + (V[b + 2] - V[a + 2]) * s);
        }
        if (pts.length < 4) continue;
        const [xa, za, xb, zb] = pts;
        // one row either side more than needed: whether a row whose centre is (nearly) exactly on an
        // end point counts is decided by the half-open test below, not by rounding in this range
        const j0 = Math.max(0, Math.ceil((Math.min(za, zb) - g.z0) / g.c - 0.5) - 1), j1 = Math.min(g.h - 1, Math.floor((Math.max(za, zb) - g.z0) / g.c - 0.5) + 1);
        for (let j = j0; j <= j1; j++) {
          const zj = g.z0 + (j + 0.5) * g.c;
          if (!((za <= zj && zj < zb) || (zb <= zj && zj < za))) continue;
          const x = xa + (xb - xa) * (zj - za) / (zb - za);
          let r = rows.get(j); if (!r) rows.set(j, r = []); r.push(x);
        }
      }
      for (const [j, r] of rows) {
        r.sort((a, b) => a - b);
        for (let k = 0; k + 1 < r.length; k += 2) {
          const i0 = Math.max(0, Math.ceil((r[k] - g.x0) / g.c - 0.5)), i1 = Math.min(g.w - 1, Math.floor((r[k + 1] - g.x0) / g.c - 0.5));
          for (let i = i0; i <= i1; i++) out[j * g.w + i] = 1;
        }
      }
    }
    return out;
  }
  function gridOver(mn0, mn2, mx0, mx2, c, pad) {
    const x0 = mn0 - pad * c, z0 = mn2 - pad * c;
    return { x0, z0, c, w: Math.ceil((mx0 - mn0) / c) + 2 * pad + 1, h: Math.ceil((mx2 - mn2) / c) + 2 * pad + 1 };
  }
  // flat ceilings with nothing under them: a bridge if walls hold them on two sides (or all round)
  // and the span is short, a small ledge if it sticks out no more than a line or two, else support
  function classifyFlats(F, G, flatTris, o) {
    const out = [], V = F.V, used = new Uint8Array(flatTris.length);
    const ys = flatTris.map(t => (V[t * 9 + 1] + V[t * 9 + 4] + V[t * 9 + 7]) / 3);
    const order = flatTris.map((_, i) => i).sort((a, b) => ys[a] - ys[b]);
    for (let s = 0; s < order.length; s++) {
      if (used[order[s]]) continue;
      const y = ys[order[s]], group = [];
      for (let q = s; q < order.length && ys[order[q]] - y < 0.05; q++) if (!used[order[q]]) { used[order[q]] = 1; group.push(flatTris[order[q]]); }
      let mn0 = Infinity, mn2 = Infinity, mx0 = -Infinity, mx2 = -Infinity;
      group.forEach(t => { for (let k = 0; k < 3; k++) { const x = V[t * 9 + k * 3], z = V[t * 9 + k * 3 + 2]; mn0 = Math.min(mn0, x); mx0 = Math.max(mx0, x); mn2 = Math.min(mn2, z); mx2 = Math.max(mx2, z); } });
      const c = Math.max(0.2, Math.max(mx0 - mn0, mx2 - mn2) / 250), g = gridOver(mn0, mn2, mx0, mx2, c, 3);
      const R = new Uint8Array(g.w * g.h), owner = new Int32Array(g.w * g.h).fill(-1);
      group.forEach(t => {
        const o9 = t * 9, x0 = V[o9], z0 = V[o9 + 2], x1 = V[o9 + 3], z1 = V[o9 + 5], x2 = V[o9 + 6], z2 = V[o9 + 8];
        const d = (z1 - z2) * (x0 - x2) + (x2 - x1) * (z0 - z2); if (Math.abs(d) < 1e-12) return;
        const i0 = Math.max(0, Math.floor((Math.min(x0, x1, x2) - g.x0) / c)), i1 = Math.min(g.w - 1, Math.ceil((Math.max(x0, x1, x2) - g.x0) / c));
        const j0 = Math.max(0, Math.floor((Math.min(z0, z1, z2) - g.z0) / c)), j1 = Math.min(g.h - 1, Math.ceil((Math.max(z0, z1, z2) - g.z0) / c));
        for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
          const x = g.x0 + (i + 0.5) * c, z = g.z0 + (j + 0.5) * c;
          const l0 = ((z1 - z2) * (x - x2) + (x2 - x1) * (z - z2)) / d, l1 = ((z2 - z0) * (x - x2) + (x0 - x2) * (z - z2)) / d;
          if (l0 < -1e-9 || l1 < -1e-9 || l0 + l1 > 1 + 1e-9) continue;
          const yy = l0 * V[o9 + 1] + l1 * V[o9 + 4] + (1 - l0 - l1) * V[o9 + 7];
          if (!supported(F, G, x, yy, z, t, o.tol, o.bedTol)) { R[j * g.w + i] = 1; owner[j * g.w + i] = F.part[t]; }
        }
      });
      const below = sliceMask(F, y - Math.max(o.tol * 1.5, 0.1), g);
      const lab = labelMask(R, g.w, g.h);
      // one pass for the whole height level: which cells hold a region up, how far every cell is
      // from such a cell, how deep every cell sits inside its region, and which anchors connect
      const anchor = new Uint8Array(g.w * g.h), notR = new Uint8Array(g.w * g.h);
      for (let i = 0; i < R.length; i++) {
        notR[i] = R[i] ? 0 : 1;
        if (R[i] || !below[i]) continue;
        if (R[i - 1] || R[i + 1] || R[i - g.w] || R[i + g.w]) anchor[i] = 1;
      }
      const toAnchor = edt(anchor, g.w, g.h), din = edt(notR, g.w, g.h);
      const runsLab = labelMask(dilateMask(anchor, g.w, g.h, 1), g.w, g.h).lab;
      const st = lab.comps.map(() => ({ edge: 0, held: 0, part: -1, reach: 0, deep: 0, runs: new Set() }));
      for (let p = 0; p < R.length; p++) {
        const id = lab.lab[p]; if (id < 0) continue;
        const c0 = st[id];
        if (c0.part < 0) c0.part = owner[p];
        if (toAnchor[p] > c0.reach) c0.reach = toAnchor[p];
        if (din[p] > c0.deep) c0.deep = din[p];
        let isEdge = false, isHeld = false;
        for (const q of [p - 1, p + 1, p - g.w, p + g.w]) {
          if (R[q]) continue; isEdge = true;
          if (anchor[q]) { isHeld = true; c0.runs.add(runsLab[q]); }
        }
        if (isEdge) { c0.edge++; if (isHeld) c0.held++; }
      }
      lab.comps.forEach((cp, id) => {
        const c0 = st[id], areaMM = cp.area * c * c;
        if (cp.area < 2 || areaMM < 1) return;
        const held = c0.held, reach = held ? c0.reach * c : Infinity, runs = c0.runs.size;
        const frac = c0.edge ? held / c0.edge : 0, twoSided = runs >= 2 || frac >= 0.9;
        // how far the region sticks out: twice its deepest point, measured from its own edge
        const width = Math.max(c, (2 * c0.deep - 1) * c);
        const kind = held && twoSided && reach * 2 <= (o.bridge ?? 10) ? "bridge" : held && Math.min(width, reach) <= (o.ledge ?? 1) ? "ledge" : "support";
        out.push({ kind, y, area: areaMM, span: isFinite(reach) ? (twoSided ? reach * 2 : Math.min(width, reach)) : null, part: c0.part,
          x: g.x0 + (cp.cx + 0.5) * c, z: g.z0 + (cp.cy + 0.5) * c });
      });
    }
    return out;
  }
  // slice heights for one part: the middle of every level between distinct vertex heights, or
  // evenly spaced ones when the part is curved all the way up, plus the first layer
  function sliceHeights(F, p, layer, maxN) {
    const V = F.V, lv = new Set();
    let lo = Infinity, hi = -Infinity;
    for (let t = F.start[p]; t < F.start[p + 1]; t++) for (let k = 0; k < 3; k++) { const y = V[t * 9 + k * 3 + 1]; lv.add(Math.round(y * 200)); lo = Math.min(lo, y); hi = Math.max(hi, y); }
    if (!(hi - lo > layer * 0.5)) return [];
    const L = [...lv].sort((a, b) => a - b).map(v => v / 200), mids = [];
    for (let i = 0; i + 1 < L.length; i++) if (L[i + 1] - L[i] >= layer) mids.push({ y: (L[i] + L[i + 1]) / 2, len: L[i + 1] - L[i] });
    let ys;
    if (mids.length && mids.length <= maxN) ys = mids.map(m => m.y);
    else { ys = []; for (let k = 0; k < maxN; k++) ys.push(lo + (hi - lo) * (k + 0.5) / maxN); }
    ys.push(lo + Math.min(layer * 0.5, (hi - lo) / 2));
    return [...new Set(ys.map(y => +y.toFixed(4)))].sort((a, b) => a - b);
  }
  // features narrower than the nozzle in one slice: whatever a disc of the nozzle's width cannot reach
  function thinCells(S, g, minW) {
    const n = minW / g.c, inv = new Uint8Array(S.length);
    for (let i = 0; i < S.length; i++) inv[i] = S[i] ? 0 : 1;
    const d = edt(inv, g.w, g.h), core = new Uint8Array(S.length), rr = (n + 1) / 2 - 0.25;
    for (let i = 0; i < S.length; i++) core[i] = S[i] && d[i] >= rr ? 1 : 0;
    const reach = dilateMask(core, g.w, g.h, n / 2 + 0.5), thin = new Uint8Array(S.length);
    for (let i = 0; i < S.length; i++) thin[i] = S[i] && !reach[i] ? 1 : 0;
    return thin;
  }
  function thinInSlice(S, g, minW) {
    const n = minW / g.c, inv = new Uint8Array(S.length);
    for (let i = 0; i < S.length; i++) inv[i] = S[i] ? 0 : 1;
    const d = edt(inv, g.w, g.h), core = new Uint8Array(S.length), rr = (n + 1) / 2 - 0.25;
    for (let i = 0; i < S.length; i++) core[i] = S[i] && d[i] >= rr ? 1 : 0;
    // the half cell of slack: on a grid the nearest core cell can sit up to a cell further in than the
    // ideal disc centre, and without it a one-cell rim round every outline reads as a thin wall
    const reach = dilateMask(core, g.w, g.h, n / 2 + 0.5), thin = new Uint8Array(S.length);
    for (let i = 0; i < S.length; i++) thin[i] = S[i] && !reach[i] ? 1 : 0;
    const lab = labelMask(thin, g.w, g.h), out = [];
    lab.comps.forEach(cp => {
      const area = cp.area * g.c * g.c, diag = Math.hypot(cp.maxX - cp.minX + 1, cp.maxY - cp.minY + 1) * g.c;
      if (area < 2 * minW * minW || diag < 2.5 * minW) return;    // sharp tips and corners, not walls
      let md = 0;
      for (let j = cp.minY; j <= cp.maxY; j++) for (let i = cp.minX; i <= cp.maxX; i++) { const p = j * g.w + i; if (lab.lab[p] === cp.id && d[p] > md) md = d[p]; }
      const width = Math.max(g.c, (2 * md - 0.5) * g.c);   // odd and even cell counts both land within half a cell
      if (width >= minW * 0.95) return;
      const cells = [];
      for (let j = cp.minY; j <= cp.maxY; j++) for (let i = cp.minX; i <= cp.maxX; i++) { const p = j * g.w + i; if (lab.lab[p] === cp.id) cells.push(p); }
      out.push({ area, width, length: area / width, x: g.x0 + (cp.cx + 0.5) * g.c, z: g.z0 + (cp.cy + 0.5) * g.c, cells });
    });
    return out;
  }
  // the whole check as a generator, so a page can yield to the browser between steps;
  // analyzePrint() below runs it to the end in one go
  function* analyzePrintSteps(parts, o) {
    o = Object.assign({ nozzle: 0.4, layer: 0.2, angle: 45, bridge: 10, maxSlices: 6, maxCells: 400, thinCells: 1200 }, o || {});
    o.tol = Math.max(0.5 * o.layer, 0.05); o.bedTol = Math.max(o.layer, 0.2); o.ledge = o.ledge ?? Math.max(1, 2.5 * o.nozzle);
    parts = parts.filter(p => p && p.pos && p.pos.length && p.idx.length);
    const F = flattenParts(parts), res = { parts: parts.map(p => p.name), tris: F.T };
    if (!F.T) return Object.assign(res, { empty: true });
    res.bounds = { mn: F.mn.slice(), mx: F.mx.slice() }; res.height = F.mx[1] - Math.max(0, F.mn[1]);
    res.floating = F.mn[1] > o.tol ? F.mn[1] : 0;
    const G = makeRayGrid(F);
    yield "overhangs";
    const scan = overhangScan(F, G, o);
    scan.narrow = narrowSteep(F, scan, o);
    yield "bridges";
    const flats = classifyFlats(F, G, scan.flatTris, o);
    const flag = scan.flag;
    // flat faces that turned out to be bridges or small ledges are not "needs support"
    const okFlat = flats.filter(f => f.kind !== "support");
    if (okFlat.length) scan.flatTris.forEach(t => { if (flag[t]) flag[t] = 2; });
    if (flats.some(f => f.kind === "support")) {
      // mark the flat faces of support regions red again, by height
      const bad = flats.filter(f => f.kind === "support").map(f => f.y);
      scan.flatTris.forEach(t => { const y = (F.V[t * 9 + 1] + F.V[t * 9 + 4] + F.V[t * 9 + 7]) / 3; if (flag[t] && bad.some(b => Math.abs(b - y) < 0.05)) flag[t] = 1; });
    }
    const perPart = parts.map(() => 0);
    let steep = 0;
    for (let t = 0; t < F.T; t++) if (flag[t] !== 2 && scan.ua[t] > 0 && F.N[t * 3 + 1] >= -0.985) { steep += scan.ua[t]; perPart[F.part[t]] += scan.ua[t]; }
    flats.forEach(f => { if (f.kind === "support" && f.part >= 0) perPart[f.part] += f.area; });
    res.overhang = { area: steep + flats.filter(f => f.kind === "support").reduce((a, f) => a + f.area, 0), steep, narrow: scan.narrow, perPart, flag,
      lowest: null, angle: o.angle };
    for (let t = 0; t < F.T; t++) if (flag[t] === 1) { const y = Math.min(F.V[t * 9 + 1], F.V[t * 9 + 4], F.V[t * 9 + 7]); if (res.overhang.lowest == null || y < res.overhang.lowest) res.overhang.lowest = y; }
    res.flats = flats;
    // triangle soups for showing the result: red where support is needed, blue where it prints anyway
    const soup = k => { let n = 0; for (let t = 0; t < F.T; t++) if (flag[t] === k) n++;
      const out = new Float32Array(n * 9); let i = 0;
      for (let t = 0; t < F.T; t++) if (flag[t] === k) { out.set(F.V.subarray(t * 9, t * 9 + 9), i); i += 9; }
      return out; };
    res.marks = { support: soup(1), fine: soup(2) };
    // first layer: how much of the model touches the bed
    yield "bed contact";
    const ext = Math.max(F.mx[0] - F.mn[0], F.mx[2] - F.mn[2]);
    const cg = gridOver(F.mn[0], F.mn[2], F.mx[0], F.mx[2], Math.max(0.1, ext / o.maxCells), 2);
    const y1 = Math.max(0, F.mn[1]) + Math.min(o.layer * 0.5, Math.max(1e-3, res.height / 2));
    const foot = sliceMask(F, y1, cg), fl = labelMask(foot, cg.w, cg.h);
    const cArea = fl.comps.reduce((a, c) => a + c.area, 0) * cg.c * cg.c;
    res.contact = { area: cArea, islands: fl.comps.length, smallest: fl.comps.length ? Math.min(...fl.comps.map(c => c.area)) * cg.c * cg.c : 0,
      grid: cg, y: y1, footprint: [F.mx[0] - F.mn[0], F.mx[2] - F.mn[2]] };
    const H = res.height, tall = H > 20 && H > 3 * Math.sqrt(Math.max(cArea, 1e-6)), tiny = cArea < 30 && H > 5;
    const warp = o.warpProne && Math.max(res.contact.footprint[0], res.contact.footprint[1]) > 100;
    res.contact.brimWhy = res.floating ? "" : tiny ? "small" : tall ? "tall" : warp ? "warp" : "";
    // thin walls, part by part
    res.thin = [];
    res.thinCell = 0;
    for (let p = 0; p < parts.length; p++) {
      let mn0 = Infinity, mn2 = Infinity, mx0 = -Infinity, mx2 = -Infinity;
      for (let t = F.start[p]; t < F.start[p + 1]; t++) for (let k = 0; k < 3; k++) { const x = F.V[t * 9 + k * 3], z = F.V[t * 9 + k * 3 + 2]; if (x < mn0) mn0 = x; if (x > mx0) mx0 = x; if (z < mn2) mn2 = z; if (z > mx2) mx2 = z; }
      if (!(mx0 > mn0)) continue;
      const c = Math.max(o.nozzle / 4, Math.max(mx0 - mn0, mx2 - mn2) / o.thinCells), g = gridOver(mn0, mn2, mx0, mx2, c, 3);
      res.thinCell = Math.max(res.thinCell, c);
      let lo = Infinity, hi = -Infinity;
      for (let t = F.start[p]; t < F.start[p + 1]; t++) for (let k = 0; k < 3; k++) { const y = F.V[t * 9 + k * 3 + 1]; if (y < lo) lo = y; if (y > hi) hi = y; }
      for (const y of sliceHeights(F, p, o.layer, o.maxSlices)) {
        yield "thin walls";
        const found = thinInSlice(sliceMask(F, y, g, p), g, o.nozzle);
        if (!found.length) continue;
        // a wall stays thin a layer further on; the rim where a rounded bottom meets the bed does not
        const dy = Math.max(o.layer, 0.25), y2 = y + dy < hi - 1e-3 ? y + dy : y - dy > lo + 1e-3 ? y - dy : null;
        const again = y2 == null ? null : thinCells(sliceMask(F, y2, g, p), g, o.nozzle);
        found.forEach(t => {
          if (again) { let k = 0; t.cells.forEach(c => { if (again[c]) k++; }); if (k * 2 < t.cells.length) return; }
          delete t.cells; res.thin.push(Object.assign(t, { part: p, name: parts[p].name, y }));
        });
      }
    }
    // the same wall found in several slices counts once: keep the thinnest per place
    const merged = [];
    res.thin.sort((a, b) => a.width - b.width).forEach(t => {
      if (!merged.some(m => m.part === t.part && Math.hypot(m.x - t.x, m.z - t.z) < Math.max(2, Math.sqrt(m.area)))) merged.push(t);
    });
    res.thin = merged;
    return res;
  }
  // flat-bottom area of one part that lies on the bed
  function bedContact(s, tol) {
    const P = s.pos, I = s.idx; let a = 0;
    for (let i = 0; i < I.length; i += 3) {
      const A = I[i] * 3, B = I[i + 1] * 3, Cc = I[i + 2] * 3;
      if (P[A + 1] > tol || P[B + 1] > tol || P[Cc + 1] > tol) continue;
      const ux = P[B] - P[A], uz = P[B + 2] - P[A + 2], wx = P[Cc] - P[A], wz = P[Cc + 2] - P[A + 2];
      a += Math.abs(ux * wz - uz * wx) / 2;
    }
    return a;
  }
  function analyzePrint(parts, o) {
    const it = analyzePrintSteps(parts, o);
    for (;;) { const r = it.next(); if (r.done) return r.value; }
  }
  // how much support an orientation needs: steep faces in full, unsupported flat ceilings at a
  // discount (many are printable bridges), and how much sits flat on the bed
  function orientationScore(parts, R, o) {
    const F = flattenParts(parts.map(p => affineSolid(p, R, [0, 0, 0])));
    const dy = -F.mn[1];
    for (let t = 0; t < F.T; t++) for (let k = 0; k < 3; k++) F.V[t * 9 + k * 3 + 1] += dy;
    F.mx[1] += dy; F.mn[1] = 0;
    const G = makeRayGrid(F), s = overhangScan(F, G, Object.assign({}, o, { sample: o.sample || 1, kMax: o.kMax || 6 }));
    const size = [F.mx[0] - F.mn[0], F.mx[1], F.mx[2] - F.mn[2]];
    const bed = o.bed || [1e9, 1e9, 1e9];
    const fits = (size[0] <= bed[0] && size[2] <= bed[1]) || (size[2] <= bed[0] && size[0] <= bed[1]);
    return { support: s.area + 0.6 * s.flatArea, steep: s.area, flat: s.flatArea, contact: s.contact, height: size[1], size, fits: fits && size[1] <= bed[2] };
  }
  // try lying the model on each side and on its biggest flat faces; keep the one that needs the least
  // support. Ties (within 3% or 2 mm²) go to the preferred direction, then more bed contact, then lower.
  function bestOrientation(parts, o) {
    const it = bestOrientationSteps(parts, o);
    for (;;) { const r = it.next(); if (r.done) return r.value; }
  }
  function* bestOrientationSteps(parts, o) {
    o = Object.assign({ angle: 45, layer: 0.2 }, o || {});
    o.tol = Math.max(0.5 * o.layer, 0.05);
    parts = parts.filter(p => p && p.pos && p.pos.length && p.idx.length);
    const F = flattenParts(parts), dirs = [[0, -1, 0], [0, 1, 0], [1, 0, 0], [-1, 0, 0], [0, 0, 1], [0, 0, -1]];
    if (o.prefer) dirs.unshift(o.prefer);
    const buckets = new Map();
    for (let t = 0; t < F.T; t++) {
      const n = [F.N[t * 3], F.N[t * 3 + 1], F.N[t * 3 + 2]], key = n.map(v => Math.round(v * 12)).join(",");
      let b = buckets.get(key); if (!b) buckets.set(key, b = { a: 0, n: [0, 0, 0] });
      b.a += F.A[t]; for (let k = 0; k < 3; k++) b.n[k] += n[k] * F.A[t];
    }
    [...buckets.values()].sort((a, b) => b.a - a.a).slice(0, 10).forEach(b => {
      const L = Math.hypot(...b.n); if (L > 0) dirs.push(b.n.map(v => v / L));
    });
    const uniq = [];
    dirs.forEach(d => { if (!uniq.some(u => u[0] * d[0] + u[1] * d[1] + u[2] * d[2] > 0.999)) uniq.push(d); });
    // ranking candidates needs less detail than the full check: sample coarser on very big meshes
    if (F.T > 50000) { o.sample = 2; o.kMax = 3; }
    const cands = [];
    for (const d of uniq) { yield cands.length / uniq.length; const R = rotationDownTo(d); cands.push(Object.assign(orientationScore(parts, R, o), { dir: d, R })); }
    const fitting = cands.some(c => c.fits) ? cands.filter(c => c.fits) : cands;
    const least = Math.min(...fitting.map(c => c.support));
    const tied = fitting.filter(c => c.support <= least + Math.max(2, least * 0.03));
    const pref = o.prefer || [0, -1, 0];
    const isPref = c => c.dir[0] * pref[0] + c.dir[1] * pref[1] + c.dir[2] * pref[2] > 0.999;
    const stable = c => !(c.height > 20 && c.height > 3 * Math.sqrt(c.contact)) && !(c.contact < 30 && c.height > 5);
    tied.sort((a, b) => (stable(b) - stable(a)) || (isPref(b) - isPref(a)) || (b.contact - a.contact > 1 ? 1 : a.contact - b.contact > 1 ? -1 : 0) || a.height - b.height);
    const best = tied[0], current = cands.find(isPref) || cands[0];
    return { R: best.R, dir: best.dir, best, current, candidates: cands };
  }
  // a one-layer ring around the first-layer outline: helps small or tall footprints stay down.
  // other colours' footprints are left out; the ring overlaps its own part by about 1.5 cells
  // parts: the model in the print frame; own[i] says whether part i is the brim's colour
  function brimSolid(parts, own, width, thick, y) {
    parts = parts.filter(p => p && p.pos && p.pos.length);
    const F = flattenParts(parts), ext = Math.max(F.mx[0] - F.mn[0], F.mx[2] - F.mn[2]) + 2 * width;
    const c = Math.max(0.1, ext / 500), g = gridOver(F.mn[0], F.mn[2], F.mx[0], F.mx[2], c, Math.ceil(width / c) + 4);
    const footAll = new Uint8Array(g.w * g.h), footOwn = new Uint8Array(g.w * g.h);
    parts.forEach((_, p) => { const m = sliceMask(F, y ?? 0.1, g, p); for (let i = 0; i < m.length; i++) if (m[i]) { footAll[i] = 1; if (own[p]) footOwn[i] = 1; } });
    const r = width / g.c, ring = dilateMask(footAll, g.w, g.h, r), own2 = erodeMask(footOwn, g.w, g.h, 2.01);   // overlap its own part a little so the two fuse
    for (let i = 0; i < ring.length; i++) if ((footAll[i] && !footOwn[i]) || own2[i]) ring[i] = 0;
    const polys = maskToPolys(ring, g.w, g.h, { mmPerPx: g.c });
    if (!polys.length) return null;
    const s = extrudePolysAt(polys, 0, thick);
    return s && transformSolid(s, 1, g.x0 + (g.w / 2 + 0.5) * g.c, 0, g.z0 + (g.h / 2 + 0.5) * g.c);
  }

  // ---------- jigsaw puzzles ----------
  // A picture cut into interlocking pieces. The cuts are exact curves (cubic Béziers) shared by
  // the two pieces on either side, so the pieces tile the puzzle perfectly; each piece is then
  // shrunk by half the fit gap by tracing its signed distance field, which cannot self-intersect
  // the way a polygon offset can. The same fields clip border pieces to a round or heart outline
  // and clip the picture's colours to each piece.

  // seeded random numbers: the same seed always cuts the same puzzle
  function seededRandom(seed) {
    let a = (Math.floor(Math.abs(seed)) || 1) >>> 0;
    return () => {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  // columns and rows for about `count` pieces that come out as square as possible
  function jigsawGrid(count, w, h) {
    count = Math.max(2, Math.round(count));
    let best = null;
    for (let nx = 1; nx <= count; nx++) {
      const ny = Math.max(1, Math.round(count / nx));
      if (nx * ny < 2) continue;
      const score = 2 * Math.abs(Math.log((w / nx) / (h / ny))) + 1.5 * Math.abs(Math.log(nx * ny / count));
      if (!best || score < best.score) best = { nx, ny, score };
    }
    return { nx: best.nx, ny: best.ny };
  }
  const JIG_STYLES = {
    classic: { hw: 1, R: 1, H: 1, nh: 1, kq: 0.5523 },
    round:   { hw: 0.92, R: 1.16, H: 1.02, nh: 0.8, kq: 0.5523 },
    square:  { hw: 1.04, R: 1.0, H: 0.98, nh: 1.1, kq: 0.93 }
  };
  const jigStyle = k => Object.prototype.hasOwnProperty.call(JIG_STYLES, k) ? JIG_STYLES[k] : JIG_STYLES.classic;
  // one cut from A to B. prm.knob false gives a gently wavy line; otherwise a knob on side prm.s.
  // Sizes are in units of the piece size u (times the knob scale), positions along the edge in L.
  function jigsawEdge(A, B, prm, u) {
    const dx = B[0] - A[0], dy = B[1] - A[1], L = Math.hypot(dx, dy) || 1e-9, tx = dx / L, ty = dy / L, sg = prm.s;
    const to = (x, y) => [A[0] + tx * x - ty * sg * y, A[1] + ty * x + tx * sg * y];
    const pts = [[A[0], A[1]]];
    const bez = (p0, p1, p2, p3, n) => {
      for (let k = 1; k <= n; k++) {
        const t = k / n, m = 1 - t, a = m * m * m, b = 3 * m * m * t, c = 3 * m * t * t, d = t * t * t;
        pts.push(to(a * p0[0] + b * p1[0] + c * p2[0] + d * p3[0], a * p0[1] + b * p1[1] + c * p2[1] + d * p3[1]));
      }
    };
    if (!prm.knob) {
      bez([0, 0], [L / 3, prm.w1 * u], [2 * L / 3, prm.w2 * u], [L, 0], 12);
      pts[pts.length - 1] = [B[0], B[1]];
      return { pts, k0: -1, k1: -1 };
    }
    const st = jigStyle(prm.style), q = u * prm.q;
    const hwL = prm.hwL * st.hw * q, hwR = prm.hwR * st.hw * q, fL = prm.fL * q, fR = prm.fR * q;
    const nh = prm.nh * st.nh * q, RL = prm.RL * st.R * q, RR = prm.RR * st.R * q, Hc = prm.H * st.H * q, ln = prm.lean * q;
    const foot = Math.max(hwL + fL, RL - ln, hwR + fR, RR + ln);
    const c = Math.min(Math.max(prm.c * L, foot + 0.1 * L), L - foot - 0.1 * L);
    const S0 = [c - hwL - fL, 0], N1 = [c - hwL, nh], HL = [c + ln - RL, Hc], T = [c + ln, Hc + (RL + RR) / 2];
    const HR = [c + ln + RR, Hc], N2 = [c + hwR, nh], S1 = [c + hwR + fR, 0], kq = st.kq, g = (Hc - nh) * 0.6;
    bez([0, 0], [S0[0] * 0.35, prm.w1 * u], [S0[0] * 0.7, 0], S0, 8);
    const k0 = pts.length - 1;
    bez(S0, [S0[0] + fL * 0.55, 0], [N1[0], nh * 0.45], N1, 6);                 // shoulder into the neck
    bez(N1, [N1[0], nh + g], [HL[0], Hc - g * 0.8], HL, 10);                   // neck out to the head
    bez(HL, [HL[0], Hc + RL * kq], [T[0] - RL * kq, T[1]], T, 10);             // head, left half of the top
    bez(T, [T[0] + RR * kq, T[1]], [HR[0], Hc + RR * kq], HR, 10);             // head, right half of the top
    bez(HR, [HR[0], Hc - g * 0.8], [N2[0], nh + g], N2, 10);
    bez(N2, [N2[0], nh * 0.45], [S1[0] - fR * 0.55, 0], S1, 6);
    const k1 = pts.length - 1;
    bez(S1, [S1[0] + (L - S1[0]) * 0.3, 0], [S1[0] + (L - S1[0]) * 0.65, prm.w2 * u], [L, 0], 8);
    pts[pts.length - 1] = [B[0], B[1]];
    return { pts, k0, k1 };
  }
  // signed distance from a point to a closed ring, positive inside
  function ringDistance(ring, x, y) {
    let best = Infinity, inside = false;
    for (let i = 0, n = ring.length, j = n - 1; i < n; j = i++) {
      const a = ring[j], b = ring[i], dx = b[0] - a[0], dy = b[1] - a[1], L2 = dx * dx + dy * dy || 1e-12;
      let t = ((x - a[0]) * dx + (y - a[1]) * dy) / L2; t = t < 0 ? 0 : t > 1 ? 1 : t;
      const ex = a[0] + t * dx - x, ey = a[1] + t * dy - y, d = ex * ex + ey * ey;
      if (d < best) best = d;
      if ((b[1] > y) !== (a[1] > y) && x < (a[0] - b[0]) * (y - b[1]) / (a[1] - b[1]) + b[0]) inside = !inside;
    }
    return inside ? Math.sqrt(best) : -Math.sqrt(best);
  }
  const ROW_LETTERS = "ABCDEFGHJKLMNPQRSTUVWXYZ";            // no I or O: they read as 1 and 0

  // The cut: o = { w, h, nx, ny, seed, vary 0..1, knob 0.7..1.3, style, outline (ring, or null for
  // the full rectangle), gap }. Returns the pieces as exact rings (before the gap) and every cut.
  function jigsawCut(o) {
    const W = o.w, H = o.h, nx = Math.max(1, o.nx | 0), ny = Math.max(1, o.ny | 0), px = W / nx, py = H / ny, u = Math.min(px, py);
    const rnd = seededRandom(o.seed || 1), U = (a, b) => a + (b - a) * rnd();
    const vary = Math.max(0, Math.min(1, o.vary ?? 0.5)), ks = Math.max(0.5, Math.min(1.5, o.knob ?? 1));
    const style = Object.prototype.hasOwnProperty.call(JIG_STYLES, o.style) ? o.style : "classic", outline = o.outline && o.outline.length > 2 ? o.outline : null;
    // corners: a jittered grid; corners on the rectangle's border only slide along it
    const cn = (i, j) => j * (nx + 1) + i, corners = [];
    for (let j = 0; j <= ny; j++) for (let i = 0; i <= nx; i++) {
      const jx = i > 0 && i < nx ? vary * U(-0.075, 0.075) * px : 0, jy = j > 0 && j < ny ? vary * U(-0.075, 0.075) * py : 0;
      corners.push([-W / 2 + i * px + jx, -H / 2 + j * py + jy]);
    }
    // every edge's random shape is drawn up front, in a fixed order, so later fixes never shift the dice
    const edges = [], edgeAt = new Map(), mk = (kind, i, j, a, b, interior) => {
      const prm = {
        knob: interior, s: rnd() < 0.5 ? 1 : -1, style, q: ks,
        c: 0.5 + vary * U(-0.06, 0.06), hwL: 0.082 * (1 + vary * U(-0.12, 0.12)), hwR: 0.082 * (1 + vary * U(-0.12, 0.12)),
        fL: 0.075 * (1 + vary * U(-0.2, 0.2)), fR: 0.075 * (1 + vary * U(-0.2, 0.2)), nh: 0.075 * (1 + vary * U(-0.15, 0.15)),
        RL: 0.134 * (1 + vary * U(-0.1, 0.14)), H: 0.212 * (1 + vary * U(-0.1, 0.1)), lean: vary * U(-0.035, 0.035),
        w1: vary * U(-0.05, 0.05), w2: vary * U(-0.05, 0.05)
      };
      prm.RR = prm.RL * (1 + vary * U(-0.08, 0.08));
      const e = { kind, i, j, a, b, prm, interior };
      edgeAt.set(kind + i + "," + j, edges.length); edges.push(e);
    };
    for (let j = 0; j <= ny; j++) for (let i = 0; i < nx; i++) mk("h", i, j, cn(i, j), cn(i + 1, j), j > 0 && j < ny);
    for (let i = 0; i <= nx; i++) for (let j = 0; j < ny; j++) mk("v", i, j, cn(i, j), cn(i, j + 1), i > 0 && i < nx);
    const shape = e => { const r = jigsawEdge(corners[e.a], corners[e.b], e.prm, u); e.pts = r.pts; e.k0 = r.k0; e.k1 = r.k1; };
    edges.forEach(e => { if (!e.interior) e.prm.w1 = e.prm.w2 = 0; shape(e); });
    // a round or heart outline: a knob must stay well inside it, or it would be sliced off
    let flattened = 0;
    if (outline) {
      const margin = 0.1 * u;
      const fits = e => { for (let k = e.k0; k <= e.k1; k++) if (ringDistance(outline, e.pts[k][0], e.pts[k][1]) < margin) return false; return true; };
      edges.forEach(e => {
        if (!e.prm.knob || fits(e)) return;
        e.prm.s = -e.prm.s; shape(e);
        if (fits(e)) return;
        e.prm.knob = false; shape(e);
        if (e.pts.some(p => ringDistance(outline, p[0], p[1]) > 0)) flattened++;
      });
    }
    // cells: bottom and right edges forward, top and left reversed, so each ring runs anticlockwise
    const E = (k, i, j) => edges[edgeAt.get(k + i + "," + j)];
    const cellEdges = (i, j) => [[E("h", i, j), 1, [i, j - 1]], [E("v", i + 1, j), 1, [i + 1, j]], [E("h", i, j + 1), -1, [i, j + 1]], [E("v", i, j), -1, [i - 1, j]]];
    // two knobs in one cell must not run into each other: shrink the one that reaches too far
    const minGap = 0.07 * u + (o.gap || 0);
    for (let pass = 0; pass < 6; pass++) {
      let changed = false;
      for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
        const list = cellEdges(i, j).map(x => x[0]);
        for (const e of list) {
          if (!e.prm.knob) continue;
          let near = Infinity;
          for (const f of list) {
            if (f === e) continue;
            for (let k = e.k0; k <= e.k1; k += 2) {
              const p = e.pts[k];
              for (let m = 0; m < f.pts.length; m++) { const d = (p[0] - f.pts[m][0]) ** 2 + (p[1] - f.pts[m][1]) ** 2; if (d < near) near = d; }
            }
          }
          if (Math.sqrt(near) < minGap) { e.prm.q *= 0.9; if (e.prm.q < ks * 0.55) e.prm.knob = false; shape(e); changed = true; }
        }
      }
      if (!changed) break;
    }
    // which cells take part, and how much of each lies inside the outline
    const cellArea = px * py, cells = [];
    const quad = (i, j) => [corners[cn(i, j)], corners[cn(i + 1, j)], corners[cn(i + 1, j + 1)], corners[cn(i, j + 1)]];
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
      const Q = quad(i, j), cx = (Q[0][0] + Q[1][0] + Q[2][0] + Q[3][0]) / 4, cy = (Q[0][1] + Q[1][1] + Q[2][1] + Q[3][1]) / 4;
      cells.push({ i, j, area: Math.abs(area2(Q)), anchor: [cx, cy], inside: 1 });
    }
    if (outline) {
      const inQ = (Q, x, y) => pointInLoop([x, y], Q), inO = insideRing(outline);
      // outline points mark every cell it passes through, so thin slivers along it are never lost
      const touched = new Set();
      for (let k = 0, n = outline.length; k < n; k++) {
        const a = outline[k], b = outline[(k + 1) % n], steps = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / (u * 0.05)));
        for (let s = 0; s < steps; s++) {
          const x = a[0] + (b[0] - a[0]) * s / steps, y = a[1] + (b[1] - a[1]) * s / steps;
          const i = Math.floor((x + W / 2) / px), j = Math.floor((y + H / 2) / py);
          for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
            const ii = i + di, jj = j + dj;
            if (ii >= 0 && jj >= 0 && ii < nx && jj < ny && inQ(quad(ii, jj), x, y)) touched.add(jj * nx + ii);
          }
        }
      }
      cells.forEach((c, k) => {
        const Q = quad(c.i, c.j), all = Q.every(p => inO(p[0], p[1]));
        if (all && !touched.has(k)) return;
        let mnx = Infinity, mxx = -Infinity, mny = Infinity, mxy = -Infinity;
        Q.forEach(p => { mnx = Math.min(mnx, p[0]); mxx = Math.max(mxx, p[0]); mny = Math.min(mny, p[1]); mxy = Math.max(mxy, p[1]); });
        const N = 24; let inq = 0, both = 0, sx = 0, sy = 0;
        for (let b = 0; b < N; b++) for (let a = 0; a < N; a++) {
          const x = mnx + (a + 0.5) / N * (mxx - mnx), y = mny + (b + 0.5) / N * (mxy - mny);
          if (!inQ(Q, x, y)) continue; inq++;
          if (inO(x, y)) { both++; sx += x; sy += y; }
        }
        c.inside = inq ? both / inq : 0;
        if (both) c.anchor = [sx / both, sy / both];
        if (!both && touched.has(k)) c.inside = 0.5 / (N * N);
      });
    }
    // pieces: every cell with anything inside the outline; small border cells join a neighbour
    const parent = cells.map((_, k) => k), find = k => { while (parent[k] !== k) k = parent[k] = parent[parent[k]]; return k; };
    const alive = cells.map(c => c.inside > 0), gArea = cells.map(c => c.area * c.inside);
    if (outline) {
      const inO = insideRing(outline);
      const sharedInside = e => { let n = 0; for (let k = 0; k < e.pts.length; k += 3) if (inO(e.pts[k][0], e.pts[k][1])) n++; return n; };
      for (let guard = 0; guard < cells.length; guard++) {
        let worst = -1, wa = Infinity;
        cells.forEach((c, k) => { if (alive[k] && find(k) === k && gArea[k] < 0.45 * cellArea && gArea[k] < wa && !c.done) { wa = gArea[k]; worst = k; } });
        if (worst < 0) break;
        let best = -1, bs = 0;
        cells.forEach((c, k) => {
          if (!alive[k] || find(k) !== worst) return;
          for (const [e, , [ii, jj]] of cellEdges(c.i, c.j)) {
            if (ii < 0 || jj < 0 || ii >= nx || jj >= ny) continue;
            const kk = jj * nx + ii; if (!alive[kk] || find(kk) === worst) continue;
            const s = sharedInside(e) + gArea[find(kk)] / cellArea * 0.01;
            if (s > bs) { bs = s; best = find(kk); }
          }
        });
        if (best < 0 || bs < 1) { cells[worst].done = true; continue; }
        parent[worst] = best; gArea[best] += gArea[worst];
      }
    }
    // each group's outline: its cells' edges that do not lead to another cell of the same group
    const groups = new Map();
    cells.forEach((c, k) => { if (alive[k]) { const r = find(k); if (!groups.has(r)) groups.set(r, []); groups.get(r).push(k); } });
    const pieces = [], bleed = Math.max(2, u * 0.1);
    const letters = ny <= ROW_LETTERS.length;
    for (const [root, members] of groups) {
      const set = new Set(members), out = new Map();
      for (const k of members) {
        const c = cells[k];
        for (const [e, dir, [ii, jj]] of cellEdges(c.i, c.j)) {
          if (ii >= 0 && jj >= 0 && ii < nx && jj < ny && set.has(jj * nx + ii)) continue;
          const from = dir > 0 ? e.a : e.b, to = dir > 0 ? e.b : e.a, pts = dir > 0 ? e.pts : e.pts.slice().reverse();
          if (!out.has(from)) out.set(from, []);
          out.get(from).push({ to, pts, border: !e.interior, used: false });
        }
      }
      // fieldRings push the border edges outward, so a piece is shrunk along its cuts only;
      // the outline itself (clip) then gives the exact outer edge
      const rings = [], fieldRings = [];
      for (const [, list] of out) for (const seg of list) {
        if (seg.used) continue;
        const ring = [], fring = []; let cur = seg, guard = 0;
        while (cur && !cur.used && guard++ < 4 * members.length + 8) {
          cur.used = true;
          for (let k = 0; k < cur.pts.length - 1; k++) ring.push(cur.pts[k]);
          if (cur.border) {
            const A = cur.pts[0], B = cur.pts[cur.pts.length - 1], l = Math.hypot(B[0] - A[0], B[1] - A[1]) || 1;
            const nx = (B[1] - A[1]) / l * bleed, ny = -(B[0] - A[0]) / l * bleed;
            fring.push(A, [A[0] + nx, A[1] + ny], [B[0] + nx, B[1] + ny]);
          } else for (let k = 0; k < cur.pts.length - 1; k++) fring.push(cur.pts[k]);
          const nxt = (out.get(cur.to) || []).find(s => !s.used);
          cur = nxt;
        }
        if (ring.length > 2) { rings.push(ring); fieldRings.push(fring); }
      }
      const main = members.reduce((a, k) => cells[k].area * cells[k].inside > cells[a].area * cells[a].inside ? k : a, members[0]);
      const mc = cells[main], row = ny - 1 - mc.j;
      pieces.push({ id: pieces.length, i: mc.i, j: mc.j, cells: members.map(k => [cells[k].i, cells[k].j]), rings, fieldRings,
        anchor: mc.anchor, area: gArea[root], label: letters ? ROW_LETTERS[row] + (mc.i + 1) : "" });
    }
    pieces.sort((a, b) => (b.j - a.j) || (a.i - b.i));
    pieces.forEach((p, k) => { p.id = k; if (!p.label) p.label = String(k + 1); });
    // cuts between two different pieces (for the preview and a laser-cut SVG)
    const cuts = edges.filter(e => {
      if (!e.interior) return false;
      const [a, b] = e.kind === "h" ? [[e.i, e.j - 1], [e.i, e.j]] : [[e.i - 1, e.j], [e.i, e.j]];
      const ka = a[1] * nx + a[0], kb = b[1] * nx + b[0];
      return alive[ka] && alive[kb] && find(ka) !== find(kb);
    }).map(e => e.pts);
    const knobs = edges.filter(e => e.interior && e.prm.knob);
    const neck = knobs.length ? Math.min(...knobs.map(e => (e.prm.hwL + e.prm.hwR) * jigStyle(style).hw * e.prm.q * u)) : 0;
    const clip = outline || [[-W / 2, -H / 2], [W / 2, -H / 2], [W / 2, H / 2], [-W / 2, H / 2]];
    return { w: W, h: H, nx, ny, u, px, py, pieces, cuts, outline, clip, flattened, neck, style };
  }

  // a banded signed distance field of closed rings (even-odd), positive inside, clamped to ±band.
  // Grid nodes sit at (x0 + i s, y1 - j s): rows run downwards like an image.
  function ringField(rings, g, band) {
    const { w, h, x0, y1, s } = g, f = new Float32Array(w * h).fill(-band), xs = [];
    for (let j = 0; j < h; j++) {
      const y = y1 - j * s; xs.length = 0;
      for (const R of rings) for (let a = 0, n = R.length, b = n - 1; a < n; b = a++) {
        const p = R[a], q = R[b];
        if ((p[1] > y) !== (q[1] > y)) xs.push(p[0] + (y - p[1]) * (q[0] - p[0]) / (q[1] - p[1]));
      }
      if (xs.length < 2) continue;
      xs.sort((m, n) => m - n);
      for (let k = 0; k + 1 < xs.length; k += 2) {
        const i0 = Math.max(0, Math.ceil((xs[k] - x0) / s)), i1 = Math.min(w - 1, Math.floor((xs[k + 1] - x0) / s));
        for (let i = i0; i <= i1; i++) f[j * w + i] = band;
      }
    }
    const gx1 = x0 + (w - 1) * s, gy0 = y1 - (h - 1) * s;
    for (const R of rings) for (let a = 0, n = R.length, b = n - 1; a < n; b = a++) {
      const ax = R[b][0], ay = R[b][1], bx = R[a][0], by = R[a][1];
      if (Math.max(ax, bx) + band < x0 || Math.min(ax, bx) - band > gx1 || Math.max(ay, by) + band < gy0 || Math.min(ay, by) - band > y1) continue;
      const i0 = Math.max(0, Math.floor((Math.min(ax, bx) - band - x0) / s)), i1 = Math.min(w - 1, Math.ceil((Math.max(ax, bx) + band - x0) / s));
      const j0 = Math.max(0, Math.floor((y1 - Math.max(ay, by) - band) / s)), j1 = Math.min(h - 1, Math.ceil((y1 - Math.min(ay, by) + band) / s));
      const dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy || 1e-12;
      for (let j = j0; j <= j1; j++) {
        const y = y1 - j * s, row = j * w;
        for (let i = i0; i <= i1; i++) {
          const x = x0 + i * s;
          let t = ((x - ax) * dx + (y - ay) * dy) / L2; t = t < 0 ? 0 : t > 1 ? 1 : t;
          const ex = ax + t * dx - x, ey = ay + t * dy - y, d = Math.sqrt(ex * ex + ey * ey), v = f[row + i];
          if (d < (v < 0 ? -v : v)) f[row + i] = v > 0 ? d : -d;
        }
      }
    }
    return f;
  }
  function gridAround(rings, s, pad) {
    let mnx = Infinity, mxx = -Infinity, mny = Infinity, mxy = -Infinity;
    for (const R of rings) for (const p of R) { if (p[0] < mnx) mnx = p[0]; if (p[0] > mxx) mxx = p[0]; if (p[1] < mny) mny = p[1]; if (p[1] > mxy) mxy = p[1]; }
    const x0 = mnx - pad - 2 * s, y1 = mxy + pad + 2 * s;
    return { x0, y1, s, w: Math.ceil((mxx - mnx + 2 * pad) / s) + 5, h: Math.ceil((mxy - mny + 2 * pad) / s) + 5, mnx, mxx, mny, mxy };
  }
  // trace a field on such a grid at iso, in millimetres
  function gridPolys(f, g, iso, minArea) {
    const polys = fieldToPolys(f, g.w, g.h, { mmPerPx: g.s, iso, eps: g.s * 0.08, minSeg: g.s * 0.2, minArea: minArea ?? g.s * g.s * 6 });
    const ox = g.x0 + (g.w / 2 - 0.5) * g.s, oy = g.y1 - (g.h / 2 - 0.5) * g.s;
    const mv = L => L.map(p => [p[0] + ox, p[1] + oy]);
    return polys.map(p => ({ outer: mv(p.outer), holes: p.holes.map(mv) }));
  }
  // the band of an outline between two offsets (negative = outside): a frame, a tray wall
  function outlineBand(ring, lo, hi, s) {
    const reach = Math.max(Math.abs(lo), isFinite(hi) ? Math.abs(hi) : 0);
    const g = gridAround([ring], s, reach), band = reach + 4 * s, f = ringField([ring], g, band);
    for (let k = 0; k < f.length; k++) { const v = f[k]; f[k] = isFinite(hi) ? Math.min(v - lo, hi - v) : v - lo; }
    return gridPolys(f, g, 0);
  }

  // ---------- a small stroke font for labels engraved on the back of each piece ----------
  // glyphs on a 4 x 6 grid, y up; each stroke is a polyline of x,y pairs
  const STROKE_FONT = {
    "0": [[0, 0, 4, 0, 4, 6, 0, 6, 0, 0], [0, 0, 4, 6]], "1": [[1, 5, 2, 6, 2, 0], [1, 0, 3, 0]], "2": [[0, 6, 4, 6, 4, 3, 0, 3, 0, 0, 4, 0]],
    "3": [[0, 6, 4, 6, 4, 0, 0, 0], [1, 3, 4, 3]], "4": [[0, 6, 0, 3, 4, 3], [3, 6, 3, 0]], "5": [[4, 6, 0, 6, 0, 3, 3, 3, 4, 2, 4, 1, 3, 0, 0, 0]],
    "6": [[3.5, 6, 1, 6, 0, 4.5, 0, 0, 4, 0, 4, 3, 0, 3]], "7": [[0, 6, 4, 6, 1, 0]], "8": [[0, 0, 4, 0, 4, 6, 0, 6, 0, 0], [0, 3, 4, 3]],
    "9": [[4, 3, 0, 3, 0, 6, 4, 6, 4, 1.5, 3, 0, 0.5, 0]],
    A: [[0, 0, 0, 4, 2, 6, 4, 4, 4, 0], [0, 3, 4, 3]], B: [[0, 0, 0, 6, 3, 6, 4, 5, 4, 4, 3, 3, 0, 3], [3, 3, 4, 2, 4, 1, 3, 0, 0, 0]],
    C: [[4, 6, 0, 6, 0, 0, 4, 0]], D: [[0, 0, 0, 6, 2, 6, 4, 4, 4, 2, 2, 0, 0, 0]], E: [[4, 6, 0, 6, 0, 0, 4, 0], [0, 3, 3, 3]],
    F: [[4, 6, 0, 6, 0, 0], [0, 3, 3, 3]], G: [[4, 6, 0, 6, 0, 0, 4, 0, 4, 3, 2, 3]], H: [[0, 6, 0, 0], [4, 6, 4, 0], [0, 3, 4, 3]],
    J: [[4, 6, 4, 0, 0, 0, 0, 2]], K: [[0, 6, 0, 0], [4, 6, 0, 3, 4, 0]], L: [[0, 6, 0, 0, 4, 0]], M: [[0, 0, 0, 6, 2, 3, 4, 6, 4, 0]],
    N: [[0, 0, 0, 6, 4, 0, 4, 6]], P: [[0, 0, 0, 6, 4, 6, 4, 3, 0, 3]], Q: [[0, 0, 0, 6, 4, 6, 4, 0, 0, 0], [2, 2, 4, 0]],
    R: [[0, 0, 0, 6, 4, 6, 4, 3, 0, 3], [2, 3, 4, 0]], S: [[4, 6, 0, 6, 0, 3, 4, 3, 4, 0, 0, 0]], T: [[0, 6, 4, 6], [2, 6, 2, 0]],
    U: [[0, 6, 0, 0, 4, 0, 4, 6]], V: [[0, 6, 2, 0, 4, 6]], W: [[0, 6, 1, 0, 2, 3, 3, 0, 4, 6]], X: [[0, 6, 4, 0], [4, 6, 0, 0]],
    Y: [[0, 6, 2, 3, 4, 6], [2, 3, 2, 0]], Z: [[0, 6, 4, 6, 0, 0, 4, 0]],
    // for labels on boxes and strips (jigsaw rows skip I and O so they cannot be misread as 1 and 0)
    I: [[1, 6, 3, 6], [2, 6, 2, 0], [1, 0, 3, 0]], O: [[0, 0, 4, 0, 4, 6, 0, 6, 0, 0]],
    "-": [[0.5, 3, 3.5, 3]], "+": [[0.5, 3, 3.5, 3], [2, 1.5, 2, 4.5]], "/": [[0, 0, 4, 6]], ".": [[1.8, 0, 2.2, 0]],
    ":": [[1.8, 1, 2.2, 1], [1.8, 4.5, 2.2, 4.5]], "%": [[0, 0, 4, 6], [0.5, 5, 1, 5.5], [3, 0.5, 3.5, 1]], " ": []
  };
  // text -> line segments in millimetres, centred on (cx, cy); mirror for reading from the back
  function strokeText(text, cx, cy, height, mirror) {
    const u = height / 6, adv = 6.6, chars = String(text).toUpperCase().split("").filter(ch => STROKE_FONT[ch]);
    const width = chars.length * adv - (adv - 4), segs = [];
    chars.forEach((ch, n) => STROKE_FONT[ch].forEach(L => {
      for (let k = 0; k + 3 < L.length; k += 2) {
        let x0 = (n * adv + L[k] - width / 2) * u, x1 = (n * adv + L[k + 2] - width / 2) * u;
        if (mirror) { x0 = -x0; x1 = -x1; }
        segs.push([cx + x0, cy + (L[k + 1] - 3) * u, cx + x1, cy + (L[k + 3] - 3) * u]);
      }
    }));
    return { segs, width: width * u, height };
  }
  // stroke text as filled outlines: everything within `half` of a stroke (a pen 2 × half wide),
  // traced from a distance field on a grid of s millimetres
  function strokePolys(segs, half, s) {
    if (!segs || !segs.length || !(half > 0)) return [];
    let mnx = Infinity, mxx = -Infinity, mny = Infinity, mxy = -Infinity;
    for (const q of segs) { mnx = Math.min(mnx, q[0], q[2]); mxx = Math.max(mxx, q[0], q[2]); mny = Math.min(mny, q[1], q[3]); mxy = Math.max(mxy, q[1], q[3]); }
    s = s > 0 ? s : Math.max(0.02, half / 5);
    const pad = half + 3 * s, x0 = mnx - pad, y1 = mxy + pad;
    const w = Math.ceil((mxx - mnx + 2 * pad) / s) + 1, h = Math.ceil((mxy - mny + 2 * pad) / s) + 1;
    const F = new Float32Array(w * h);
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      const x = x0 + i * s, y = y1 - j * s; let d = Infinity;
      for (const q of segs) {
        const dx = q[2] - q[0], dy = q[3] - q[1], L2 = dx * dx + dy * dy || 1e-12;
        let t = ((x - q[0]) * dx + (y - q[1]) * dy) / L2; t = t < 0 ? 0 : t > 1 ? 1 : t;
        const ex = q[0] + t * dx - x, ey = q[1] + t * dy - y, dd = ex * ex + ey * ey; if (dd < d) d = dd;
      }
      F[j * w + i] = half - Math.sqrt(d);
    }
    return gridPolys(F, { x0, y1, s, w, h }, 0, s * s * 2);
  }

  // Where a label fits on a piece: the spot whose strokes keep the most plastic between them and
  // the piece's edge, nearest the middle on a tie. Knob sockets cut deep into a piece, so the
  // middle is often not it. Shrinks the text (down to minHeight) before giving up.
  function placeLabel(F, g, L) {
    const inside = new Uint8Array(g.w * g.h);
    for (let k = 0; k < inside.length; k++) inside[k] = F[k] < 0 ? 1 : 0;
    const D = edt(inside, g.w, g.h), s = g.s;                 // distance to the outside, in grid steps
    const at = (x, y) => { const i = Math.round((x - g.x0) / s), j = Math.round((g.y1 - y) / s); return i < 0 || j < 0 || i >= g.w || j >= g.h ? 0 : D[j * g.w + i] * s; };
    const cx0 = (g.mnx + g.mxx) / 2, cy0 = (g.mny + g.mxy) / 2, pref = L.near || [cx0, cy0];
    for (let hgt = L.height; hgt >= L.minHeight - 1e-9; hgt *= 0.85) {
      const half = Math.max(L.minHalf || 0.25, hgt * 0.1), probe = strokeText(L.text, 0, 0, hgt, L.mirror);
      const pts = [];
      probe.segs.forEach(q => { for (let t = 0; t <= 1.0001; t += 0.25) pts.push([q[0] + (q[2] - q[0]) * t, q[1] + (q[3] - q[1]) * t]); });
      const need = half + (L.margin ?? 0.8), step = Math.max(s, 0.35);
      let best = null;
      for (let y = g.mny; y <= g.mxy; y += step) for (let x = g.mnx; x <= g.mxx; x += step) {
        if (at(x, y) < need) continue;
        let clear = Infinity;
        for (const p of pts) { const d = at(x + p[0], y + p[1]); if (d < clear) clear = d; if (clear < need) break; }
        if (clear < need) continue;
        const score = Math.min(clear, need + 1.5) * 10 - Math.hypot(x - pref[0], y - pref[1]);
        if (!best || score > best.score) best = { score, x, y };
      }
      if (best) return { segs: strokeText(L.text, best.x, best.y, hgt, L.mirror).segs, half, at: [best.x, best.y], height: hgt };
    }
    return null;
  }
  // One piece, shrunk by half the gap along its cuts and clipped to the outline (pass cut.clip,
  // the outline or the full rectangle, so the puzzle's outer edge stays exact), for extruding:
  // o = { gap, s, outline, extra (first-layer inset), label (see placeLabel), colours: [{ slot, cov, gx, gy, cell, W, H }] }
  // Returns { body, first (first layer, if different), top: [{ slot, polys }] }.
  function jigsawPiece(piece, o) {
    const s = o.s, g2 = Math.max(0, o.gap || 0) / 2, extra = Math.max(0, o.extra || 0);
    const band = g2 + extra + 4 * s, g = gridAround(piece.rings, s, 0), N = g.w * g.h;
    const F = ringField(o.outline && piece.fieldRings ? piece.fieldRings : piece.rings, g, band);
    for (let k = 0; k < N; k++) F[k] -= g2;
    if (o.outline) { const Fo = ringField([o.outline], g, band); for (let k = 0; k < N; k++) if (Fo[k] < F[k]) F[k] = Fo[k]; }
    const minArea = Math.max(g.s * g.s * 6, 0.5);
    const body = gridPolys(F, g, 0, minArea);
    const out = { body, first: null, top: [] };
    if (!body.length) return out;
    // the first layer: pulled in a little more, and with the label cut out of it
    const lab = o.label && o.label.text ? placeLabel(F, g, o.label) : null;
    out.label = lab;
    if (extra > 0 || lab) {
      const B = new Float32Array(F);
      if (extra > 0) for (let k = 0; k < N; k++) B[k] -= extra;
      if (lab) {
        const hw = lab.half, S = lab.segs;
        let mnx = Infinity, mxx = -Infinity, mny = Infinity, mxy = -Infinity;
        S.forEach(q => { mnx = Math.min(mnx, q[0], q[2]); mxx = Math.max(mxx, q[0], q[2]); mny = Math.min(mny, q[1], q[3]); mxy = Math.max(mxy, q[1], q[3]); });
        const r = hw + 3 * s;
        const i0 = Math.max(0, Math.floor((mnx - r - g.x0) / s)), i1 = Math.min(g.w - 1, Math.ceil((mxx + r - g.x0) / s));
        const j0 = Math.max(0, Math.floor((g.y1 - mxy - r) / s)), j1 = Math.min(g.h - 1, Math.ceil((g.y1 - mny + r) / s));
        for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
          const x = g.x0 + i * s, y = g.y1 - j * s; let d = Infinity;
          for (const q of S) {
            const dx = q[2] - q[0], dy = q[3] - q[1], L2 = dx * dx + dy * dy || 1e-12;
            let t = ((x - q[0]) * dx + (y - q[1]) * dy) / L2; t = t < 0 ? 0 : t > 1 ? 1 : t;
            const ex = q[0] + t * dx - x, ey = q[1] + t * dy - y, dd = ex * ex + ey * ey; if (dd < d) d = dd;
          }
          const inText = hw - Math.sqrt(d), k = j * g.w + i;
          if (-inText < B[k]) B[k] = -inText;
        }
      }
      out.first = gridPolys(B, g, 0, minArea);
    }
    // the picture's colours, clipped to the piece
    const cols = o.colours || [];
    if (cols.length) {
      const present = cols.filter(c => {
        const i0 = Math.max(0, Math.floor((g.mnx + c.W / 2) / c.cell) - 1), i1 = Math.min(c.gx - 1, Math.ceil((g.mxx + c.W / 2) / c.cell) + 1);
        const j0 = Math.max(0, Math.floor((c.H / 2 - g.mxy) / c.cell) - 1), j1 = Math.min(c.gy - 1, Math.ceil((c.H / 2 - g.mny) / c.cell) + 1);
        for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) if (c.cov[j * c.gx + i] > 0.5) return true;
        return false;
      });
      if (present.length === 1) out.top.push({ slot: present[0].slot, polys: body });
      else for (const c of present) {
        const G = new Float32Array(N), k = 3 * c.cell;
        for (let j = 0; j < g.h; j++) {
          const py = Math.min(c.gy - 1, Math.max(0, (c.H / 2 - (g.y1 - j * s)) / c.cell - 0.5)), y0 = Math.min(c.gy - 2, Math.floor(py)), fy = py - y0;
          for (let i = 0; i < g.w; i++) {
            const n = j * g.w + i; if (F[n] < -2 * s) { G[n] = F[n]; continue; }
            const qx = Math.min(c.gx - 1, Math.max(0, (g.x0 + i * s + c.W / 2) / c.cell - 0.5)), x0 = Math.min(c.gx - 2, Math.floor(qx)), fx = qx - x0;
            const a = c.cov[y0 * c.gx + x0], b = c.cov[y0 * c.gx + x0 + 1], cc = c.cov[(y0 + 1) * c.gx + x0], d = c.cov[(y0 + 1) * c.gx + x0 + 1];
            const v = ((a * (1 - fx) + b * fx) * (1 - fy) + (cc * (1 - fx) + d * fx) * fy - 0.5) * k;
            G[n] = v < F[n] ? v : F[n];
          }
        }
        const polys = gridPolys(G, g, 0, Math.max(g.s * g.s * 4, 0.05));
        if (polys.length) out.top.push({ slot: c.slot, polys });
      }
    }
    return out;
  }

  // the cuts that are really cut: trimmed to a shaped outline (the grid runs past it), in mm
  function jigsawCutLines(cut) {
    const inO = cut.outline ? insideRing(cut.outline) : null, out = [];
    if (!inO) return cut.cuts.map(L => L.slice());
    const edge = (a, b) => { for (let it = 0; it < 14; it++) { const c = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]; if (inO(c[0], c[1])) a = c; else b = c; } return a; };
    for (const L of cut.cuts) {
      let run = [];
      const flush = () => { if (run.length > 1) out.push(run); run = []; };
      for (let k = 0; k < L.length; k++) {
        const p = L[k], ok = inO(p[0], p[1]);
        if (ok && k > 0 && !inO(L[k - 1][0], L[k - 1][1])) run.push(edge(p, L[k - 1]));   // coming in: start on the outline
        if (ok) run.push(p);
        else if (run.length) { run.push(edge(run[run.length - 1], p)); flush(); }        // going out: stop on the outline
      }
      flush();
    }
    return out;
  }
  // the cut lines as a true-scale SVG, for a laser cutter or a vinyl plotter
  function jigsawSVG(cut, title) {
    const W = cut.w, H = cut.h, m = 5, f3 = v => (+v.toFixed(3)).toString();
    const toSvg = p => f3(p[0] + W / 2 + m) + "," + f3(H / 2 - p[1] + m);
    const paths = jigsawCutLines(cut).map(L => "M" + L.map(toSvg).join("L"));
    const ring = cut.outline || [[-W / 2, -H / 2], [W / 2, -H / 2], [W / 2, H / 2], [-W / 2, H / 2]];
    paths.push("M" + ring.map(toSvg).join("L") + "Z");
    return '<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="' + f3(W + 2 * m) + 'mm" height="' + f3(H + 2 * m) +
      'mm" viewBox="0 0 ' + f3(W + 2 * m) + " " + f3(H + 2 * m) + '">\n<title>' + esc(title || "Jigsaw") + " (" + cut.pieces.length + " pieces)</title>\n" +
      '<g fill="none" stroke="#ff0000" stroke-width="0.1" stroke-linejoin="round" stroke-linecap="round">\n' +
      paths.map(d => '<path d="' + d + '"/>').join("\n") + "\n</g>\n</svg>\n";
  }

  // ---------- lithophanes: a thickness grid as a closed solid ----------
  // Nodes u_i = u0 + i*c (i < gx), v_j = v0 + j*cv (j < gy, j = 0 at the bottom; cv defaults to c); thick[j*gx+i] > 0.
  // sdf (optional, same grid): <= 0 inside the outline. Each grid triangle is clipped to sdf <= 0
  // along straight lines between edge crossings; a crossing is keyed by its grid edge, so the two
  // triangles sharing an edge share the vertex and the sheet stays watertight. wrap joins the last
  // column to the first (a cylinder). map(u, v, w) -> [x, y, z] must be right-handed: the front
  // (w = thickness) faces +w, the back is w = 0. The back is a copy of the grid unless o.back says
  // it can be simpler: "flat" (map is affine: triangulate the outline itself) or "columns" (no
  // outline, straight lines along v at w = 0: one tall quad per column, e.g. a cylinder).
  function heightSheet(o) {
    const { gx, gy, u0, v0, c, thick, map } = o, cv = o.cv || c, wrap = !!o.wrap, NN = gx * gy;
    const sdf = o.sdf ? Float32Array.from(o.sdf) : null;
    if (sdf) for (let k = 0; k < NN; k++) if (Math.abs(sdf[k]) < 1e-6 * c) sdf[k] = 1e-6 * c;   // nothing exactly on the line
    const inside = k => !sdf || sdf[k] <= 0;
    // planar vertices: nodes keep their index, crossings are appended
    let U = new Float64Array(Math.max(16, NN >> 2)), V = new Float64Array(U.length), T = new Float64Array(U.length), nx = 0;
    const cross = new Map(), grow = () => { const n = U.length * 2, a = new Float64Array(n), b = new Float64Array(n), t = new Float64Array(n); a.set(U); b.set(V); t.set(T); U = a; V = b; T = t; };
    const nodeU = (k, iu) => u0 + iu * c;
    const crossing = (a, ia, b, ib) => {               // a, b node ids; ia, ib unwrapped column indices
      const key = a < b ? a * NN + b : b * NN + a;
      let id = cross.get(key);
      if (id === undefined) {
        const sa = sdf[a], sb = sdf[b], t = sa / (sa - sb);
        if (nx >= U.length) grow();
        U[nx] = nodeU(a, ia) + (nodeU(b, ib) - nodeU(a, ia)) * t;
        const ja = (a / gx) | 0, jb = (b / gx) | 0;
        V[nx] = v0 + (ja + (jb - ja) * t) * cv;
        T[nx] = thick[a] + (thick[b] - thick[a]) * t;
        id = NN + nx++; cross.set(key, id);
      }
      return id;
    };
    const tris = [], walls = [];
    const border = (a, b, ia, ib) => {                  // a triangle edge on the outside of the grid
      const ja = (a / gx) | 0, jb = (b / gx) | 0;
      if (ja === jb && (ja === 0 || ja === gy - 1)) return true;
      return !wrap && ia === ib && (ia === 0 || ia === gx - 1);
    };
    const poly = [], tag = [];
    const tri = (a, ia, b, ib, d, id) => {              // counter-clockwise in (u, v)
      const vs = [a, b, d], is = [ia, ib, id];
      if (!sdf) {
        tris.push(a, b, d);
        for (let k = 0; k < 3; k++) { const p = vs[k], q = vs[(k + 1) % 3]; if (border(p, q, is[k], is[(k + 1) % 3])) walls.push(p, q); }
        return;
      }
      const inn = vs.map(inside);
      if (!inn[0] && !inn[1] && !inn[2]) return;
      poly.length = 0; tag.length = 0;
      for (let k = 0; k < 3; k++) {
        const k2 = (k + 1) % 3, P = vs[k], Q = vs[k2];
        if (inn[k]) { poly.push(P); tag.push(k); }
        if (inn[k] !== inn[k2]) { poly.push(crossing(P, is[k], Q, is[k2])); tag.push(inn[k] ? -1 : k); }
      }
      for (let k = 1; k + 1 < poly.length; k++) tris.push(poly[0], poly[k], poly[k + 1]);
      for (let k = 0; k < poly.length; k++) {
        const e = tag[k], A = poly[k], B = poly[(k + 1) % poly.length];
        if (e === -1 || border(vs[e], vs[(e + 1) % 3], is[e], is[(e + 1) % 3])) walls.push(A, B);
      }
    };
    const cols = wrap ? gx : gx - 1;
    for (let j = 0; j < gy - 1; j++) for (let i = 0; i < cols; i++) {
      const i2 = i + 1, w2 = i2 % gx;
      const a = j * gx + i, b = j * gx + w2, cc = (j + 1) * gx + w2, d = (j + 1) * gx + i;
      if ((i + j) & 1) { tri(a, i, b, i2, cc, i2); tri(a, i, cc, i2, d, i); }
      else { tri(a, i, b, i2, d, i); tri(b, i2, cc, i2, d, i); }
    }
    if (!tris.length) return null;
    // 3D: a top and a bottom vertex for every planar vertex in use
    const top = new Int32Array(NN + nx).fill(-1), bot = new Int32Array(NN + nx).fill(-1), pos = [];
    const put = (k, w) => { const p = k < NN ? map(u0 + (k % gx) * c, v0 + ((k / gx) | 0) * cv, w) : map(U[k - NN], V[k - NN], w); pos.push(p[0], p[1], p[2]); return pos.length / 3 - 1; };
    const th = k => k < NN ? thick[k] : T[k - NN];
    const vt = k => top[k] >= 0 ? top[k] : (top[k] = put(k, th(k)));
    const vb = k => bot[k] >= 0 ? bot[k] : (bot[k] = put(k, 0));
    let back = null;
    if (o.back === "flat") back = flatBack(walls, k => k < NN ? u0 + (k % gx) * c : U[k - NN], k => k < NN ? v0 + ((k / gx) | 0) * cv : V[k - NN]);
    else if (o.back === "columns" && !sdf) {
      back = [];
      for (let i = 0; i < cols; i++) { const a = i, b = (i + 1) % gx, d = (gy - 1) * gx + i, e = (gy - 1) * gx + b; back.push(a, b, e, a, e, d); }
    }
    const idx = new Uint32Array(tris.length * (back ? 1 : 2) + (back ? back.length : 0) + walls.length * 3);
    let n = 0;
    for (let t = 0; t < tris.length; t += 3) {
      const a = tris[t], b = tris[t + 1], d = tris[t + 2];
      idx[n++] = vt(a); idx[n++] = vt(b); idx[n++] = vt(d);
      if (!back) { idx[n++] = vb(a); idx[n++] = vb(d); idx[n++] = vb(b); }
    }
    if (back) for (let t = 0; t < back.length; t += 3) { idx[n++] = vb(back[t]); idx[n++] = vb(back[t + 2]); idx[n++] = vb(back[t + 1]); }
    for (let e = 0; e < walls.length; e += 2) {
      const a = walls[e], b = walls[e + 1];
      idx[n++] = vb(a); idx[n++] = vb(b); idx[n++] = vt(b);
      idx[n++] = vb(a); idx[n++] = vt(b); idx[n++] = vt(a);
    }
    const solid = { pos: new Float32Array(pos), idx };
    if (signedVolume(solid) < 0) for (let i = 0; i < idx.length; i += 3) { const t = idx[i + 1]; idx[i + 1] = idx[i + 2]; idx[i + 2] = t; }
    return solid;
  }

  // the boundary edges (pairs of planar vertex ids, region on the left) chained into loops and
  // triangulated counter-clockwise; null if they do not form simple loops
  function flatBack(walls, U, V) {
    const next = new Map();
    for (let e = 0; e < walls.length; e += 2) { if (next.has(walls[e])) return null; next.set(walls[e], walls[e + 1]); }
    const loops = [], done = new Set();
    for (const start of next.keys()) {
      if (done.has(start)) continue;
      const L = []; let k = start;
      do { if (done.has(k) || !next.has(k)) return null; done.add(k); L.push([U(k), V(k), k]); k = next.get(k); } while (k !== start);
      loops.push(L);
    }
    const out = [];
    for (const poly of groupLoops(loops)) {
      const flat = [], holeIdx = [], ids = [];
      const push = L => { for (const p of L) { flat.push(p[0], p[1]); ids.push(p[2]); } };
      push(poly.outer); for (const h of poly.holes) { holeIdx.push(ids.length); push(h); }
      const t = global.earcut(flat, holeIdx, 2);
      for (let i = 0; i < t.length; i += 3) {
        const a = t[i], b = t[i + 1], d = t[i + 2];
        const ccw = (flat[2 * b] - flat[2 * a]) * (flat[2 * d + 1] - flat[2 * a + 1]) - (flat[2 * d] - flat[2 * a]) * (flat[2 * b + 1] - flat[2 * a + 1]) >= 0;
        out.push(ids[a], ccw ? ids[b] : ids[d], ccw ? ids[d] : ids[b]);
      }
    }
    return out.length ? out : null;
  }

  global.PRCore = {
    hexToRgb, rgbToHex, colorDist, luma, kmeans, buildCellMap, makeProjector, buildDecalSolids, weldSoup, parseSTL,
    prepareParts, make3MF, make3MF_BBL, makeSTL, makeOBJ, traceMask, groupLoops, triangulate, solidFromTris, buildVectorSolid,
    extrudePolys, extrudePolysAt, closeMask, smoothMask, revolve, revolveLoop, sweepTube, traceField, fieldToPolys, strokePolys, signedDistanceField, coverageField, blurMask, homography, applyH, warpQuad, quadCorners, refineQuad, fitDimensions, convexHull, outlineSVG, outlineDXF, transformSolid, mirrorSolid, solidBounds, mirrorMaskX, perforate, insideRing, snapToGrid, signedVolume, buildMaskSolid, maskOfSlot, checkMesh, edt, dilateMask, erodeMask, labelMask, maskToPolys, ringCircle, ringRect, ringStar, ringPoly, ringHeart, mergeSolids, area2,
    affineSolid, mat3Mul, rotationDownTo, analyzePrint, analyzePrintSteps, bestOrientation, bestOrientationSteps, orientationScore, brimSolid, bedContact, sliceMask, gridOver, flattenParts,
    seededRandom, jigsawGrid, jigsawCut, jigsawEdge, jigsawPiece, jigsawSVG, jigsawCutLines, ringField, ringDistance, outlineBand, strokeText,
    gridAround, heightSheet
  };
})(typeof window !== "undefined" ? window : globalThis);
