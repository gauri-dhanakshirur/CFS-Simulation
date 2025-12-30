#!/bin/bash

# 1. Create build directory if it doesn't exist
if [ ! -d "build" ]; then
    mkdir build
fi

# 2. Move into build directory
cd build

# 3. Configure CMake
echo "[1/3] Configuring CMake..."
cmake ..
if [ $? -ne 0 ]; then
    echo "CMake Configuration Failed!"
    exit 1
fi

# 4. Build the project (using make)
echo "[2/3] Compiling Project..."
make
if [ $? -ne 0 ]; then
    echo "Compilation Failed!"
    exit 1
fi

# 5. Run the executable
cd ..
echo "[3/3] Running Scheduler..."
echo "---------------------------------------------------"

# Check if an argument was passed to the script
if [ -z "$1" ]; then
    ./build/scheduler
else
    ./build/scheduler "$1"
fi