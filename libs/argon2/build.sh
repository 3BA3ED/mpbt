#!/bin/bash
set -euxo pipefail
cmake .
cmake --build .
