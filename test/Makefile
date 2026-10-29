# Host tests for the firmware's pure logic (no ESP32 needed):  make -C test
CXX ?= g++
CXXFLAGS ?= -std=c++17 -O1 -Wall -Wextra -Werror -I../firmware/RGBLampController

test: test_core
	./test_core

test_core: test_core.cpp ../firmware/RGBLampController/lamp_core.h
	$(CXX) $(CXXFLAGS) -o $@ test_core.cpp -lm

clean:
	rm -f test_core

.PHONY: test clean
