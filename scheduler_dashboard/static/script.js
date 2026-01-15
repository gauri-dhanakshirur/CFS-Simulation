document.addEventListener('DOMContentLoaded', () => {
    let currentAlgo = 'cfs';
    let pidCounter = 1;

    // --- DOM Elements ---
    const processList = document.getElementById('process-list');
    const rowTemplate = document.getElementById('process-row-template');
    const algoTitle = document.getElementById('algo-title');
    const menuItems = document.querySelectorAll('.menu-item');
    const extraParamHeader = document.querySelector('.extra-param-header');
    
    // Select the 4th header span (PID, Arrival, Burst, Priority)
    const priorityHeader = document.querySelector('.table-header span:nth-child(4)');

    const tableOutput = document.getElementById('table-output');
    const metricsOutput = document.getElementById('metrics-output');
    const statusBadge = document.getElementById('status-badge');
    const algoDescText = document.getElementById('algo-desc-text');
    const algoFormula = document.getElementById('algo-formula');

    // --- Algorithm Content ---
    const ALGO_CONTENT = {
        'cfs': {
            title: 'Completely Fair Scheduler (CFS)',
            desc: `<p>The Completely Fair Scheduler (CFS) models an "ideal, precise multi-tasking CPU". It tracks <i>virtual runtime</i> (vruntime) via a red-black tree. The task with the lowest vruntime is picked next. Priorities are mapped to weights: higher weight (lower nice value) slows down vruntime growth, granting more CPU time.</p>`,
            formula: `<strong>vruntime += &Delta;exec &times; (W<sub>base</sub> / W<sub>i</sub>)</strong>`
        },
        'edf': {
            title: 'Earliest Deadline First (EDF)',
            desc: `<p>EDF is a dynamic priority real-time algorithm. It prioritizes tasks with the closest <b>Absolute Deadline</b>. If a new task arrives with a sooner deadline than the current one, preemption occurs.</p>`,
            formula: `<strong>Priority &propto; 1 / (T<sub>arrival</sub> + T<sub>deadline</sub>)</strong>`
        },
        'fcfs': {
            title: 'First Come First Serve (FCFS)',
            desc: `<p>FCFS executes processes strictly in the order of their arrival. It is simple but suffers from the "Convoy Effect" where short processes wait behind long ones.</p>`,
            formula: `<strong>Wait = T<sub>start</sub> - T<sub>arrival</sub></strong>`
        },
        'mlfq': {
            title: 'Multi-Level Feedback Queue (MLFQ)',
            desc: `<p>MLFQ uses multiple queues with different priorities and time slices. Processes start at the top. If they use their full time slice, they are demoted. This favors interactive (I/O) jobs over CPU-bound jobs.</p>`,
            formula: `<strong>If T<sub>cpu</sub> > TQ, Demote(P)</strong>`
        },
        'priority': {
            title: 'Preemptive Priority Scheduling',
            desc: `<p>The CPU is assigned to the process with the highest priority (lowest number). If a higher priority process arrives, the current one is preempted.</p>`,
            formula: `<strong>Min(Priority Value) = Highest Priority</strong>`
        },
        'propshare': {
            title: 'Proportional Share (Lottery)',
            desc: `<p>Also known as Lottery Scheduling. Each process holds a number of <b>Tickets</b>. The scheduler holds a random lottery at each step; the chance of running corresponds to the percentage of total tickets held.</p>`,
            formula: `<strong>P(win) = Tickets<sub>i</sub> / &Sigma; Tickets<sub>all</sub></strong>`
        },
        'rms': {
            title: 'Rate Monotonic Scheduling (RMS)',
            desc: `<p>A static real-time algorithm for periodic tasks. Priorities are assigned based on cycle duration (Period). Shorter period = Higher priority.</p>`,
            formula: `<strong>Priority &propto; 1 / Period</strong>`
        },
        'rr': {
            title: 'Round Robin (RR)',
            desc: `<p>Each process gets a small unit of CPU time (Time Quantum). When time runs out, the process goes to the back of the queue.</p>`,
            formula: `<strong>Run min(Burst, TQ), then switch</strong>`
        },
        'sjf': {
            title: 'Shortest Job First (SRTF)',
            desc: `<p>SRTF selects the process with the smallest <b>Remaining Time</b>. If a new job arrives with less time than the current one has left, it preempts.</p>`,
            formula: `<strong>Select min(Burst - Executed)</strong>`
        }
    };

    // --- Core Functions ---

    function updateStatus(state, msg) {
        const dot = '<span class="status-dot"></span>';
        statusBadge.innerHTML = `${dot} ${msg}`;
        statusBadge.className = `status-badge ${state}`;
    }

    /**
     * Updates the header and input constraints for the Priority/Tickets column.
     * Also handles setting default values when switching algorithms.
     */
    function updatePriorityColumn(algoName) {
        const inputs = document.querySelectorAll('.input-priority');

        if (algoName === 'propshare') {
            // FIX: PropShare uses Tickets.
            priorityHeader.textContent = "TICKETS";
            inputs.forEach(input => {
                input.removeAttribute('max'); // Remove 0-9 limit
                input.placeholder = "e.g. 100";
                
                // --- NEW LOGIC: Default to 1 if value is 0 ---
                // 0 tickets means 0% chance to run, which is usually not desired as a default.
                if (parseInt(input.value) === 0) {
                    input.value = 1;
                }
            });
        } else {
            // Standard Algorithms use Priority 0-9
            priorityHeader.textContent = "PRIORITY";
            inputs.forEach(input => {
                input.setAttribute('max', '9');
                input.placeholder = "0-9";
                // Clamp values back to valid range if switching back from PropShare
                if (parseInt(input.value) > 9) input.value = 9;
            });
        }
    }

    function addProcessRow() {
        const clone = rowTemplate.content.cloneNode(true);
        const row = clone.querySelector('.process-row');
        row.querySelector('.input-pid').value = pidCounter++;
        
        const extraInput = row.querySelector('.input-extra');
        toggleExtraField(extraInput);
        
        // --- NEW LOGIC: Set default value based on algorithm ---
        const prioInput = row.querySelector('.input-priority');
        if (currentAlgo === 'propshare') {
            prioInput.removeAttribute('max');
            prioInput.placeholder = "e.g. 100";
            prioInput.value = 1; // Default Tickets = 1
        } else {
            prioInput.setAttribute('max', '9');
            prioInput.value = 0; // Default Priority = 0
        }

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

    function switchAlgorithm(algoName) {
        currentAlgo = algoName;
        const content = ALGO_CONTENT[algoName];

        // 1. Update Title and Active Menu
        algoTitle.textContent = content.title;
        menuItems.forEach(item => item.classList.remove('active'));
        document.querySelector(`[data-algo="${algoName}"]`).classList.add('active');

        // 2. Inject Content
        algoDescText.innerHTML = content.desc;
        algoFormula.innerHTML = `
            <div class="formula-header">Mathematical Model</div>
            <div class="formula-body">${content.formula}</div>
        `;

        // 3. Handle Extra Fields
        toggleExtraField(extraParamHeader);
        const extraInputs = processList.querySelectorAll('.input-extra');
        extraInputs.forEach(toggleExtraField);

        // 4. Update Priority/Ticket Column (Handles the default 1 logic)
        updatePriorityColumn(algoName);

        // 5. Reset Results
        resetResults();
    }

    function resetResults() {
        tableOutput.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">📊</div>
                <p>No simulation data available</p>
            </div>`;
        metricsOutput.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">⚡</div>
                <p>Run simulation to view metrics</p>
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
        let tableHtml = `<table class="output-table"><thead><tr><th>PID</th><th>AT</th><th>BT</th><th>WT</th><th>TAT</th><th>RT</th></tr></thead><tbody>`;
        data.processes.forEach(p => {
            tableHtml += `<tr><td>P${p.pid}</td><td>${p.at}</td><td>${p.bt}</td><td>${p.wt}</td><td>${p.tat}</td><td>${p.rt}</td></tr>`;
        });
        tableHtml += '</tbody></table>';
        tableOutput.innerHTML = tableHtml;

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

    // --- Listeners ---
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

    // Init
    switchAlgorithm(currentAlgo);
    addProcessRow();
    addProcessRow();
    addProcessRow();
});