document.addEventListener('DOMContentLoaded', () => {
    let currentAlgo = 'cfs';
    let pidCounter = 1;

    // --- DOM Elements ---
    const processList = document.getElementById('process-list');
    const rowTemplate = document.getElementById('process-row-template');
    const algoTitle = document.getElementById('algo-title');
    const menuItems = document.querySelectorAll('.menu-item');
    const extraParamHeader = document.querySelector('.extra-param-header');
    const tableOutput = document.getElementById('table-output');
    const metricsOutput = document.getElementById('metrics-output');
    const statusBadge = document.getElementById('status-badge');
    
    // Description Elements
    const algoDescText = document.getElementById('algo-desc-text');
    const algoFormula = document.getElementById('algo-formula');

    // --- Algorithm Content Definitions ---
    const ALGO_CONTENT = {
        'cfs': {
            title: 'Completely Fair Scheduler (CFS)',
            desc: `
                <p>The Completely Fair Scheduler (CFS) is the default process scheduler for the Linux kernel. It aims to model an "ideal, precise multi-tasking CPU" on real hardware. Unlike traditional schedulers that use fixed time slices, CFS tries to divide CPU time among all tasks proportionally based on their weights.</p>
                <p>It maintains a <b>red-black tree</b> timeline of tasks ordered by their <i>virtual runtime</i> (vruntime). The task with the lowest vruntime (the one that has received the least fair share of the CPU) is always picked next. As a task runs, its vruntime increases; if it runs too long, it moves to the right of the tree, giving other tasks a chance. This ensures fairness and inherently handles I/O bound tasks efficiently without complex heuristics.</p>
            `,
            formula: `
                <strong>vruntime<sub>i</sub> += &Delta;exec &times; <span class="fraction">(W<sub>base</sub> / W<sub>i</sub>)</span></strong>
                <ul class="var-list">
                    <li><b>vruntime<sub>i</sub></b>: The virtual runtime of process <i>i</i>.</li>
                    <li><b>&Delta;exec</b>: The actual physical time the process ran.</li>
                    <li><b>W<sub>base</sub></b>: The weight of a standard priority process (usually 1024).</li>
                    <li><b>W<sub>i</sub></b>: The weight of process <i>i</i> (derived from its priority/niceness).</li>
                </ul>
            `
        },
        'edf': {
            title: 'Earliest Deadline First (EDF)',
            desc: `
                <p>Earliest Deadline First (EDF) is a dynamic priority scheduling algorithm used primarily in real-time operating systems. It assigns priorities to tasks based on their absolute deadlines. The task with the closest deadline is given the highest priority and is executed first.</p>
                <p>EDF is an <b>optimal</b> uniprocessor scheduling algorithm, meaning if a set of tasks is schedulable by any algorithm, it is schedulable by EDF. It is a preemptive algorithm; if a new task arrives with a deadline closer than the currently running task, the running task is preempted.</p>
            `,
            formula: `
                <strong>Priority(P<sub>i</sub>) &propto; 1 / D<sub>abs</sub></strong>
                <br>where <strong>D<sub>abs</sub> = T<sub>arrival</sub> + T<sub>relative_deadline</sub></strong>
                <ul class="var-list">
                    <li><b>D<sub>abs</sub></b>: Absolute Deadline (specific point in time).</li>
                    <li><b>T<sub>arrival</sub></b>: The time at which the process entered the system.</li>
                    <li><b>T<sub>relative</sub></b>: The time duration within which the task must complete.</li>
                </ul>
            `
        },
        'fcfs': {
            title: 'First Come First Serve (FCFS)',
            desc: `
                <p>First Come First Serve (FCFS) is the simplest scheduling algorithm. Processes are dispatched to the CPU in the exact order they arrive in the ready queue, much like a grocery store checkout line. It is a <b>non-preemptive</b> algorithm, meaning once a process starts running, it continues until it terminates or performs I/O.</p>
                <p>While easy to implement, FCFS suffers from the <i>Convoy Effect</i>: if a CPU-intensive process arrives first, many short I/O-bound processes effectively get stuck waiting behind it, leading to high average waiting times and poor device utilization.</p>
            `,
            formula: `
                <strong>WT<sub>i</sub> = T<sub>start</sub> - T<sub>arrival</sub></strong>
                <ul class="var-list">
                    <li><b>WT<sub>i</sub></b>: Waiting Time for process <i>i</i>.</li>
                    <li><b>T<sub>start</sub></b>: The time when the process first gets the CPU.</li>
                    <li><b>T<sub>arrival</sub></b>: The time when the process arrived in the queue.</li>
                </ul>
            `
        },
        'mlfq': {
            title: 'Multi-Level Feedback Queue (MLFQ)',
            desc: `
                <p>The Multi-Level Feedback Queue (MLFQ) is designed to optimize both turnaround time and response time without knowing process burst times in advance. It uses multiple distinct queues, each with a different priority level and time quantum.</p>
                <p>New processes enter the highest priority queue (short time slice). If a process uses its entire time slice, it is assumed to be CPU-bound and is demoted to a lower priority queue. If it gives up the CPU voluntarily (I/O), it stays at the same level. This naturally separates interactive processes (high priority) from background batch jobs (low priority).</p>
            `,
            formula: `
                <strong>Rule 1: If Priority(A) > Priority(B), Run A.</strong><br>
                <strong>Rule 2: If Priority(A) = Priority(B), Run RR.</strong>
                <ul class="var-list">
                    <li><b>Demotion:</b> Occurs if <i>Time<sub>spent</sub></i> > <i>Time_Quantum</i>.</li>
                    <li><b>Aging:</b> Periodically boost all processes to top queue to prevent starvation.</li>
                </ul>
            `
        },
        'priority': {
            title: 'Preemptive Priority Scheduling',
            desc: `
                <p>In Priority Scheduling, each process is assigned a numerical priority. The CPU is allocated to the process with the highest priority currently in the ready queue. In this simulation, we follow the convention that a <b>lower number indicates higher priority</b> (e.g., 0 is highest).</p>
                <p>Because this is the <i>preemptive</i> version, if a newly arrived process has a higher priority than the currently running process, the scheduler immediately stops the current process and switches to the new one. A major drawback is <i>indefinite blocking</i> (starvation), where low-priority tasks may never execute if high-priority tasks keep arriving.</p>
            `,
            formula: `
                <strong>Select P<sub>i</sub> such that Prio(P<sub>i</sub>) = min(Prio(P<sub>all</sub>))</strong>
                <ul class="var-list">
                    <li><b>Prio(P)</b>: The priority value assigned to the process.</li>
                    <li><b>min(...)</b>: Selecting the minimum value (highest priority).</li>
                </ul>
            `
        },
        'propshare': {
            title: 'Proportional Share (Lottery Scheduling)',
            desc: `
                <p>Proportional Share scheduling, often implemented as Lottery Scheduling, is based on the concept of sharing the CPU in proportion to the importance of the tasks. Each process is issued a certain number of "tickets" (represented here by the priority field).</p>
                <p>At every scheduling decision point (time slice), the scheduler holds a probabilistic lottery. It picks a random ticket number, and the process holding that ticket wins the CPU. Over time, the percentage of CPU time a process gets will statistically match the percentage of total tickets it holds.</p>
            `,
            formula: `
                <strong>P(win) = Tickets<sub>i</sub> / Tickets<sub>total</sub></strong>
                <ul class="var-list">
                    <li><b>P(win)</b>: Probability of process <i>i</i> running next.</li>
                    <li><b>Tickets<sub>i</sub></b>: Number of tickets held by process <i>i</i>.</li>
                    <li><b>Tickets<sub>total</sub></b>: Sum of tickets of all active processes.</li>
                </ul>
            `
        },
        'rms': {
            title: 'Rate Monotonic Scheduling (RMS)',
            desc: `
                <p>Rate Monotonic Scheduling (RMS) is a static priority scheduling algorithm used for periodic tasks in real-time systems. Priorities are assigned based on the cycle duration (period) of the job: tasks with shorter periods (higher frequency) get higher priorities.</p>
                <p>RMS is optimal among fixed-priority algorithms. However, schedulability is only guaranteed if the total CPU utilization is below a specific theoretical bound (approx 69% for large N). If utilization exceeds this, deadlines may be missed.</p>
            `,
            formula: `
                <strong>Priority &propto; 1 / T<sub>period</sub></strong><br>
                <strong>U &le; n(2<sup>1/n</sup> - 1)</strong>
                <ul class="var-list">
                    <li><b>T<sub>period</sub></b>: The cycle time of the task (Period).</li>
                    <li><b>U</b>: Total CPU Utilization.</li>
                    <li><b>n</b>: Number of processes.</li>
                </ul>
            `
        },
        'rr': {
            title: 'Round Robin (RR)',
            desc: `
                <p>Round Robin (RR) is one of the most widely used algorithms for multitasking systems. It allows every process to use the CPU for a brief, fixed interval of time called a <i>Time Quantum</i> (or Time Slice).</p>
                <p>Once a process executes for its time quantum, it is preempted and moved to the back of the ready queue, allowing the next process to run. This ensures that no single process monopolizes the CPU and provides good response time for interactive systems. However, performance depends heavily on the length of the time quantum.</p>
            `,
            formula: `
                <strong>Runtime = min(Burst<sub>rem</sub>, TQ)</strong>
                <ul class="var-list">
                    <li><b>Burst<sub>rem</sub></b>: Remaining burst time of the process.</li>
                    <li><b>TQ</b>: Time Quantum (fixed time slice).</li>
                </ul>
            `
        },
        'sjf': {
            title: 'Shortest Job First (SRTF)',
            desc: `
                <p>Shortest Job First (SJF) is an algorithm that selects the process with the smallest execution time. This simulation implements the <b>Preemptive</b> version, commonly known as <i>Shortest Remaining Time First (SRTF)</i>.</p>
                <p>If a new process arrives with a CPU burst length less than the remaining time of the currently executing process, the scheduler preempts the current one. This algorithm is provably optimal for minimizing the average waiting time, but it requires precise knowledge of how long a process will run, which is difficult to predict in real-world general-purpose systems.</p>
            `,
            formula: `
                <strong>Select P<sub>i</sub> where BT<sub>rem</sub> is minimized.</strong>
                <ul class="var-list">
                    <li><b>BT<sub>rem</sub></b>: Remaining Burst Time (Total Burst - Executed Time).</li>
                </ul>
            `
        }
    };

    // --- Core Functions ---

    function updateStatus(state, msg) {
        const dot = '<span class="status-dot"></span>';
        statusBadge.innerHTML = `${dot} ${msg}`;
        statusBadge.className = `status-badge ${state}`;
    }

    function addProcessRow() {
        const clone = rowTemplate.content.cloneNode(true);
        const row = clone.querySelector('.process-row');
        row.querySelector('.input-pid').value = pidCounter++;
        const extraInput = row.querySelector('.input-extra');
        toggleExtraField(extraInput);
        row.querySelector('.btn-delete').addEventListener('click', () => {
            row.remove();
            renumberPIDs();
        });
        processList.appendChild(clone);
    }

    function renumberPIDs() {
        pidCounter = 1;
        const rows = processList.querySelectorAll('.process-row');
        rows.forEach(row => {
            row.querySelector('.input-pid').value = pidCounter++;
        });
    }

    function toggleExtraField(element) {
        const needsExtra = ['edf', 'rms'].includes(currentAlgo);
        if (needsExtra) element.classList.remove('hidden');
        else element.classList.add('hidden');
    }

    // --- Switch Algorithm Function ---
    function switchAlgorithm(algoName) {
        currentAlgo = algoName;
        const content = ALGO_CONTENT[algoName];

        // 1. Update Title and Active Menu State
        algoTitle.textContent = content.title;
        menuItems.forEach(item => item.classList.remove('active'));
        document.querySelector(`[data-algo="${algoName}"]`).classList.add('active');

        // 2. Inject Description
        algoDescText.innerHTML = content.desc;
        
        // 3. Inject Formula (Matches new CSS structure)
        algoFormula.innerHTML = `
            <div class="formula-header">Mathematical Model</div>
            <div class="formula-body">${content.formula}</div>
        `;

        // 4. Handle Extra Fields (Deadline/Period)
        toggleExtraField(extraParamHeader);
        const extraInputs = processList.querySelectorAll('.input-extra');
        extraInputs.forEach(toggleExtraField);

        // 5. Reset Results View
        resetResults();
    }

    function resetResults() {
        tableOutput.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">📊</div>
                <p>Run simulation to see details.</p>
            </div>`;
        metricsOutput.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">⚡</div>
                <p>Run simulation for metrics.</p>
            </div>`;
        updateStatus('ready', 'System Ready');
    }

    function getFormData() {
        const rows = processList.querySelectorAll('.process-row');
        const processes = [];
        rows.forEach(row => {
            const p = {
                pid: parseInt(row.querySelector('.input-pid').value),
                arrival: parseInt(row.querySelector('.input-arrival').value) || 0,
                burst: parseInt(row.querySelector('.input-burst').value) || 1,
                priority: parseInt(row.querySelector('.input-priority').value) || 0
            };
            if (['edf', 'rms'].includes(currentAlgo)) {
                p.extraParam = parseInt(row.querySelector('.input-extra').value) || 0;
            }
            processes.push(p);
        });
        return { algorithm: currentAlgo, processes: processes };
    }

    function renderResults(data) {
        // Table
        let tableHtml = `<table class="output-table"><thead><tr><th>PID</th><th>AT</th><th>BT</th><th>WT</th><th>TAT</th><th>RT</th></tr></thead><tbody>`;
        data.processes.forEach(p => {
            tableHtml += `<tr><td>P${p.pid}</td><td>${p.at}</td><td>${p.bt}</td><td>${p.wt}</td><td>${p.tat}</td><td>${p.rt}</td></tr>`;
        });
        tableHtml += '</tbody></table>';
        tableOutput.innerHTML = tableHtml;

        // Metrics
        const avgs = data.averages;
        if (!avgs || Object.keys(avgs).length === 0) {
            metricsOutput.innerHTML = '<div class="empty-state"><p>No metrics available.</p></div>';
            return;
        }
        metricsOutput.innerHTML = `
            <ul class="metrics-list">
                <li><span class="metric-label">Avg Wait Time</span> <span class="metric-value">${avgs.avg_wt}</span></li>
                <li><span class="metric-label">Avg Turnaround</span> <span class="metric-value">${avgs.avg_tat}</span></li>
                <li><span class="metric-label">Avg Response</span> <span class="metric-value">${avgs.avg_rt}</span></li>
                <li><span class="metric-label">CPU Utilization</span> <span class="metric-value">${avgs.cpu_util}</span></li>
                <li><span class="metric-label">Throughput</span> <span class="metric-value">${avgs.throughput}</span></li>
            </ul>`;
        
        updateStatus('ready', 'Simulation Completed');
    }

    // --- Event Listeners ---
    menuItems.forEach(item => {
        item.addEventListener('click', (e) => switchAlgorithm(e.target.closest('.menu-item').dataset.algo));
    });

    document.getElementById('btn-add-process').addEventListener('click', addProcessRow);

    document.getElementById('btn-execute').addEventListener('click', async () => {
        const payload = getFormData();
        if (payload.processes.length === 0) {
            alert("Please add at least one process.");
            return;
        }

        updateStatus('running', 'Simulating...');

        try {
            const response = await fetch('/api/simulate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Server error');
            renderResults(data);
        } catch (error) {
            console.error(error);
            updateStatus('error', 'Error');
            tableOutput.innerHTML = `<div class="empty-state" style="color:#ef4444"><p>Simulation Failed</p></div>`;
        }
    });

    // --- Initialization ---
    switchAlgorithm(currentAlgo);
    addProcessRow();
    addProcessRow();
    addProcessRow();
});