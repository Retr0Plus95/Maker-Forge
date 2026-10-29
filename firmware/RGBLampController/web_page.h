// RGB Lamp Controller: the two pages the lamp serves. Everything is in here: no fonts, scripts or pictures
// from the internet, so the page works on the lamp's own set-up network too.
#pragma once

// The lamp: on/off, colour, brightness, effect, speed, sleep timer. Talks to /api/state and /api/set.
static const char LAMP_PAGE[] = R"HTML(<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="theme-color" content="#0f1218"><title>RGB Lamp</title><style>
:root{--bg:#0f1218;--card:#181d27;--line:#2a3142;--text:#e8ecf3;--dim:#9aa3b5;--lamp:#ffa046}
*{box-sizing:border-box}
body{margin:0;font:16px/1.45 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;background:var(--bg);color:var(--text)}
main{max-width:480px;margin:0 auto;padding:16px}
header{display:flex;align-items:center;justify-content:space-between;margin:4px 0 14px}
h1{font-size:21px;margin:0;letter-spacing:.5px}
.glow{height:88px;border-radius:16px;background:var(--lamp);box-shadow:0 0 44px -4px var(--lamp);transition:background .3s,box-shadow .3s,opacity .3s;margin-bottom:14px}
.off .glow{opacity:.12;box-shadow:none}
section{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:14px;margin-bottom:12px}
.lab{display:flex;justify-content:space-between;color:var(--dim);font-size:14px;margin:0 0 8px}
input[type=range]{width:100%;accent-color:var(--lamp);height:30px;margin:0}
button{font:inherit;cursor:pointer}
.power{min-width:72px;height:40px;border-radius:20px;border:1px solid var(--line);background:#222a38;color:var(--text);font-weight:700}
.on .power{background:var(--lamp);color:#111;border-color:transparent}
.pick{display:flex;gap:12px;align-items:center;color:var(--dim);font-size:14px}
input[type=color]{width:58px;height:42px;border:1px solid var(--line);border-radius:10px;background:none;padding:2px}
.sw{display:grid;grid-template-columns:repeat(6,1fr);gap:10px;margin-top:12px}
.sw button{aspect-ratio:1;border-radius:50%;border:2px solid #0006}
.fx{display:flex;flex-wrap:wrap;gap:8px}
.fx button{padding:8px 13px;border-radius:999px;border:1px solid var(--line);background:#222a38;color:var(--text)}
.fx button[aria-pressed=true]{background:var(--text);color:#111}
.gap{margin-top:14px}
select{width:100%;padding:9px;border-radius:9px;background:#222a38;color:var(--text);border:1px solid var(--line);font:inherit}
footer{color:var(--dim);font-size:13px;text-align:center;margin-top:16px}
footer a{color:var(--dim)}
:focus-visible{outline:2px solid var(--text);outline-offset:2px}
</style></head>
<body class="on"><main>
<header><h1>RGB Lamp</h1><button class="power" id="pw" aria-pressed="true">ON</button></header>
<div class="glow" id="glow" aria-hidden="true"></div>
<section><div class="lab"><span>Colour</span><span id="hexv"></span></div>
<div class="pick"><input type="color" id="col" aria-label="Pick any colour"><span>Tap the square for any colour, or a dot below.</span></div>
<div class="sw" id="sw"></div></section>
<section><label class="lab" for="bri"><span>Brightness</span><span id="briv"></span></label><input type="range" id="bri" min="1" max="255"></section>
<section><div class="lab"><span>Effect</span></div><div class="fx" id="fx" role="group" aria-label="Effect"></div>
<label class="lab gap" for="spd"><span>Speed</span><span id="spdv"></span></label><input type="range" id="spd" min="1" max="10"></section>
<section><label class="lab" for="slp"><span>Sleep timer</span><span id="slpv"></span></label>
<select id="slp"><option value="0">Off</option><option value="15">15 minutes</option><option value="30">30 minutes</option>
<option value="60">1 hour</option><option value="120">2 hours</option></select></section>
<footer id="ft"></footer></main>
<script>
var $=function(i){return document.getElementById(i)},S=null,touched=0,timer=null;
var SW=["#ff0000","#ff5a00","#ffa046","#ffdc00","#00ff00","#00ffb4","#00c8ff","#0000ff","#6e00ff","#ff00a0","#c8dcff","#ffffff"];
function send(p){touched=Date.now();var b=new URLSearchParams(p);
 fetch("/api/set",{method:"POST",body:b}).then(function(r){return r.json()}).then(show).catch(function(){});}
function later(p){touched=Date.now();clearTimeout(timer);timer=setTimeout(function(){send(p)},120);}
function show(s){S=s;var fresh=Date.now()-touched>900;
 document.body.className=s.on?"on":"off";$("pw").textContent=s.on?"ON":"OFF";$("pw").setAttribute("aria-pressed",s.on);
 document.documentElement.style.setProperty("--lamp",s.hex);$("hexv").textContent=s.hex.toUpperCase();
 if(fresh){$("col").value=s.hex;$("bri").value=s.bri;$("spd").value=s.speed;$("slp").value=String(s.sleep);}
 $("briv").textContent=Math.round(s.bri/2.55)+" %";$("spdv").textContent=s.speed+" of 10";
 var fx=$("fx");if(!fx.children.length)s.effects.forEach(function(n,i){var b=document.createElement("button");b.textContent=n;
  b.onclick=function(){send({effect:i})};fx.appendChild(b);});
 for(var i=0;i<fx.children.length;i++)fx.children[i].setAttribute("aria-pressed",i===s.effect);
 $("slpv").textContent=s.sleepLeft?Math.ceil(s.sleepLeft/60)+" min left":"";
 var f=$("ft");f.textContent=(s.setup?"Set-up network":s.ssid)+" · "+s.ip+(s.setup?"":" · "+s.rssi+" dBm")+" · v"+s.version+" · ";
 var a=document.createElement("a");a.href="/wifi";a.textContent="Wi-Fi settings";f.appendChild(a);}
function poll(){fetch("/api/state").then(function(r){return r.json()}).then(function(s){if(Date.now()-touched>900)show(s)}).catch(function(){});}
SW.forEach(function(c){var b=document.createElement("button");b.style.background=c;b.setAttribute("aria-label","Colour "+c);
 b.onclick=function(){send({hex:c})};$("sw").appendChild(b);});
$("pw").onclick=function(){send({on:S&&S.on?0:1})};
$("col").oninput=function(){later({hex:this.value})};
$("bri").oninput=function(){$("briv").textContent=Math.round(this.value/2.55)+" %";later({bri:this.value})};
$("spd").oninput=function(){$("spdv").textContent=this.value+" of 10";later({speed:this.value})};
$("slp").onchange=function(){send({sleep:this.value})};
poll();setInterval(poll,2000);
</script></body></html>)HTML";

// Wi-Fi set-up: pick the home network and type its password.
static const char WIFI_PAGE[] = R"HTML(<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>RGB Lamp: Wi-Fi</title><style>
body{margin:0;font:16px/1.45 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;background:#0f1218;color:#e8ecf3}
main{max-width:440px;margin:0 auto;padding:20px 16px}
h1{font-size:21px;margin:0 0 6px}p{color:#9aa3b5;margin:0 0 16px}
label{display:block;color:#9aa3b5;font-size:14px;margin:14px 0 6px}
input[type=text],input[type=password]{width:100%;box-sizing:border-box;padding:11px;border-radius:10px;border:1px solid #2a3142;background:#181d27;color:#e8ecf3;font:inherit}
.show{display:flex;gap:8px;align-items:center;margin-top:8px;color:#9aa3b5;font-size:14px}
button{margin-top:18px;width:100%;padding:12px;border-radius:10px;border:0;background:#ffa046;color:#111;font:inherit;font-weight:700;cursor:pointer}
a{color:#9aa3b5}
</style></head><body><main>
<h1>Connect the lamp to your Wi-Fi</h1>
<p>Choose your network and type its password. The lamp restarts, joins it, and is then at <b>http://rgb-lamp.local/</b>.</p>
<form method="post" action="/wifi">
<label for="ssid">Network name</label><input type="text" id="ssid" name="ssid" list="nets" maxlength="32" required autocomplete="off">
<datalist id="nets"></datalist>
<label for="pass">Password</label><input type="password" id="pass" name="pass" maxlength="63" autocomplete="off">
<div class="show"><input type="checkbox" id="sh"><label for="sh" style="margin:0">Show password</label></div>
<button type="submit">Save and restart</button></form>
<p style="margin-top:18px"><a href="/lamp">Use the lamp without Wi-Fi</a></p>
<script>
document.getElementById("sh").onchange=function(){document.getElementById("pass").type=this.checked?"text":"password"};
function scan(n){fetch("/scan").then(function(r){return r.json()}).then(function(j){
 if(j.busy){if(n<15)setTimeout(function(){scan(n+1)},1000);return;}
 var d=document.getElementById("nets");j.nets.forEach(function(s){var o=document.createElement("option");o.value=s;d.appendChild(o);});
}).catch(function(){});}
scan(0);
</script></main></body></html>)HTML";
