cmake_minimum_required(VERSION 3.10)
project(SchedulerSimulation C)

set(CMAKE_C_STANDARD 99)
include_directories(${CMAKE_SOURCE_DIR})

# 1. Find all C source files in subdirectories automatically
file(GLOB_RECURSE ALGO_SOURCES
    common.c
    "FCFS/*.c" 
    "SJF/*.c" 
    "Priority/*.c" 
    "RR/*.c" 
    "MLFQ/*.c" 
    "EDF/*.c" 
    "PropShare/*.c" 
    "RMS/*.c" 
    "CFS/*.c"
)

# 2. Add main.c and the found sources to the executable
add_executable(scheduler main.c ${ALGO_SOURCES})

# 3. Link math library (only needed on Linux/Mac, ignored on Windows)
if(NOT MSVC)
    target_link_libraries(scheduler m)
endif()