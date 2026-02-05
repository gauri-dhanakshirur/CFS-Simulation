# Advanced CPU Scheduler Simulator

A comprehensive, interactive educational tool for visualizing and comparing CPU scheduling algorithms. This project combines a high-performance C backend for simulation logic with a modern Python/Flask web dashboard for rich visualizations.

## Key Features

-   **9 Scheduling Algorithms**: Implementations of classic and advanced algorithms including CFS (Completely Fair Scheduler).
-   **Interactive Dashboard**: Web-based interface to configure processes and view results in real-time.
-   **Rich Visualizations**:
    -   **Gantt Charts**: Visual timeline of process execution.
    -   **VRuntime Graphs**: Exclusive visualization for CFS virtual runtime convergence.
    -   **Performance Metrics**: Bar charts for Waiting Time, Turnaround Time, Response Time, and Throughput.
    -   **Fairness Analysis**: Jain's Fairness Index calculator.
-   **Comparison Mode**: Run different algorithms on the same dataset and compare performance side-by-side.
-   **Educational Content**: In-depth explanations of each algorithm built directly into the UI.

## Technology Stack

-   **Simulation Core**: C (for precise, low-level scheduling logic)
-   **API Layer**: Python Flask
-   **Frontend**: HTML5, CSS3, JavaScript (Chart.js for graphs)
-   **Build System**: CMake

## Supported Algorithms

1.  **FCFS** (First Come First Serve)
2.  **SJF** (Shortest Job First - Non-preemptive)
3.  **RR** (Round Robin)
4.  **Priority** (Preemptive)
5.  **MLFQ** (Multi-Level Feedback Queue)
6.  **EDF** (Earliest Deadline First - Real Time)
7.  **RMS** (Rate Monotonic Scheduling - Real Time)
8.  **Proportional Share** (Lottery Scheduling)
9.  **CFS** (Completely Fair Scheduler)

---

## Getting Started

### Prerequisites

-   **C Compiler**: GCC or Clang
-   **CMake**: Version 3.10+
-   **Python**: Version 3.8+
-   **Python Packages**: `flask`

### Installation

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/yourusername/cfs-simulation.git
    cd cfs-simulation
    ```

2.  **Build the C Simulation Core**:
    ```bash
    mkdir build
    cd build
    cmake ..
    cmake --build . --config Debug
    cd ..
    ```

3.  **Install Python Dependencies**:
    ```bash
    pip install flask
    ```

### Running the Web Dashboard (Recommended)

1.  **Start the Flask Server**:
    ```bash
    cd scheduler_dashboard
    python app.py
    ```

2.  **Access the Dashboard**:
    Open your browser and navigate to `http://localhost:5000`.

### Running in CLI Mode

You can also run the simulation directly in the terminal without the web interface.

**Windows:**
```powershell
.\run.bat
```

**Linux/macOS:**
```bash
./run.sh
```

---

## Project Structure

```text
.
├── scheduler_dashboard/     # Python Flask Web Application
│   ├── static/              # CSS, JavaScript, and Assets
│   ├── templates/           # HTML Templates
│   └── app.py               # Main Flask Application
├── CFS/                     # Completely Fair Scheduler Source
├── FCFS/                    # First Come First Serve Source
├── ...                      # Other Algorithm Sources
├── common.c                 # Shared Simulation Logic
├── main.c                   # CLI Entry Point
├── CMakeLists.txt           # Build Config
└── README.md                # Project Documentation
```


