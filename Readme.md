# CPU Scheduler Simulation

A comprehensive CPU scheduling simulation tool written in C. This project implements various scheduling algorithms, ranging from standard batch processing to real-time and fair queuing systems.

## Supported Algorithms

1.  **FCFS** (First Come First Serve)
2.  **Priority** (Preemptive Priority Scheduler)
3.  **SJF** (Shortest Job First)
4.  **RR** (Round Robin)
5.  **MLFQ** (Multi-Level Feedback Queue - 2 Queues)
6.  **EDF** (Earliest Deadline First - Real Time)
7.  **Proportional Share** (Lottery Scheduling)
8.  **RMS** (Rate Monotonic Scheduling - Real Time)
9.  **CFS** (Completely Fair Scheduler - AVL Tree)

## Project Structure

```text
scheduler_project/
├── run.bat              # Windows Automation Script
├── run.sh               # Linux/macOS Automation Script
├── CMakeLists.txt       # Build configuration
├── .gitattributes
├── .gitignore
├── main.c               
├── common.h             # Shared structures (Process) and helper functions
├── common.c             
├── CFS/                 # Completely Fair Scheduler
│   └── cfs.h
│   └── cfs.c
├── FCFS/                # First Come First Serve
│   └── fcfs.h
│   └── fcfs.c
├── SJF/                 # Shortest Job First
│   └── sjf.h
│   └── sjf.c
├── Priority/            # Priority Scheduling
│   └── priority.h
│   └── priority.c
├── RR/                  # Round Robin
│   └── rr.h
│   └── rr.c
├── MLFQ/                # Multi-Level Feedback Queue
│   └── mlfq.h
│   └── mlfq.c
├── EDF/                 # Earliest Deadline First
│   └── edf.h
│   └── edf.c
├── PropShare/           # Proportional Share
│   └── propshare.h
│   └── propshare.c
└── RMS/                 # Rate Monotonic Scheduling
    └── rms.h
    └── rms.c
```

## Quick Start (Recommended)

This project includes automation scripts to handle building and running the code in one step.

### Windows
```powershell
# Run interactively (will ask for algorithm ID)
.\run.bat

# OR run a specific algorithm immediately (e.g., CFS)
.\run.bat 9
```

### Linux/macOS
```bash
# Run interactively (will ask for algorithm ID)
./run.sh

# OR run a specific algorithm immediately (e.g., CFS)
./run.sh 9
```

## Manual Build Instructions (If you prefer manually using cmake)

### Prerequisites
* **C Compiler:** GCC, Clang, or MSVC (Visual Studio)
* **Build Tool:** [CMake](https://cmake.org/download/) (Version 3.10 or higher)
  
### Windows (Visual Studio / PowerShell)
1.  Open a terminal in the project root.
2.  Create a build directory:
    ```powershell
    mkdir build
    cd build
    ```
3.  Generate build files:
    ```powershell
    cmake ..
    ```
4.  Compile the project:
    ```powershell
    cmake --build .
    ```
5.  Execute the project:
    ```powershell
    .\Debug\scheduler.exe algorithmID
    ```

### Linux / macOS
```bash
mkdir build
cd build
cmake ..
make
./scheduler algorithmID
```

### Algorithm IDs
<img width="219" height="374" alt="image" src="https://github.com/user-attachments/assets/96600166-892e-40f4-9a33-ea88224ce111" />

## NOTE
Follow the prompts to enter process details.
* Priority: * Standard: 0-9 (Lower number implies higher priority).
    * Proportional Share: Treated as "Tickets".
    * CFS: Mapped to "Weights" (Priority 0 = High Weight, Priority 9 = Low Weight).
* Real-Time Params:
    * EDF: Requires Relative Deadline.
    * RMS: Requires Period.
