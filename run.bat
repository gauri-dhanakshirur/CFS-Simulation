@echo off
REM Windows Build & Run Script

REM 1. Create build directory if it doesn't exist
if not exist build (
    mkdir build
)

REM 2. Move into build directory
cd build

REM 3. Configure CMake (Generates build files)
echo [1/3] Configuring CMake...
cmake ..
if %errorlevel% neq 0 (
    echo CMake Configuration Failed!
    cd ..
    pause
    exit /b %errorlevel%
)

REM 4. Build the project
echo [2/3] Compiling Project...
cmake --build .
if %errorlevel% neq 0 (
    echo Compilation Failed!
    cd ..
    pause
    exit /b %errorlevel%
)

REM 5. Run the executable
REM Check if user provided an algorithm ID (e.g., ./run.bat 9)
REM If not, default to asking inside the program (no arguments)
cd ..
echo [3/3] Running Scheduler...
echo ---------------------------------------------------

if "%1"=="" (
    .\build\Debug\scheduler.exe
) else (
    .\build\Debug\scheduler.exe %1
)

pause