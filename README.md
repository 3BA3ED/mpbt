# Mnemonic phrase backup tool
---
[![Build](https://github.com/3BA3ED/mpbt/actions/workflows/build.yml/badge.svg)](https://github.com/3BA3ED/mpbt/actions/workflows/build.yml)

🚧 **Work In Progress** 🚧

A collection of tools to secure BIP39 mnemonic phrase backups.

Use [online demo version](https://3BA3ED.github.com/mpbt/) or download `mpbt.html` from
[releases](https://github.com/3BA3ED/mpbt/releases). 

### Features
- **Encrypt** mnemonic phrases to secure online and offline backups
- **Split** into multiple shares, with only some required for restoring
- **Portable** - small html file that runs in most modern browsers
- **Customizable** encryption - choose kdf and set parameters
- **Deniable encryption** - decrypt with any password

## Build
---
```
npm i
npm run build
```

##### Building argon2 with emscripten
```
# Get the emsdk repo
git clone https://github.com/emscripten-core/emsdk.git

# Download and install the latest SDK tools.
./emsdk install latest

# Make the "latest" SDK "active" for the current user. (writes .emscripten file)
./emsdk activate latest

# Activate PATH and other environment variables in the current terminal
source ./emsdk/emsdk_env.sh

cd mpbt/libs/argon2
cmake .
cmake --build .
```
