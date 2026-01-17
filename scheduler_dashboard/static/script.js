document.addEventListener('DOMContentLoaded', () => {
    let currentAlgo = 'cfs';
    let pidCounter = 1;

    // --- Metrics Storage for Comparison ---
    const ALGO_ORDER = ['cfs', 'edf', 'fcfs', 'mlfq', 'priority', 'propshare', 'rms', 'rr', 'sjf'];
    const simulationResults = {}; // { algoName: { avg_wt, avg_tat, ... } }
    let charts = {}; // Chart.js instances

    // --- DOM Elements ---
    const processList = document.getElementById('process-list');
    const rowTemplate = document.getElementById('process-row-template');
    const algoTitle = document.getElementById('algo-title');
    const menuItems = document.querySelectorAll('.menu-item');
    const extraParamHeader = document.querySelector('.extra-param-header');

    // Select the 4th header span (PID, Arrival, Burst, Priority)
    const priorityHeader = document.querySelector('.table-header span:nth-child(4)');
    const globalSettings = document.getElementById('global-settings');

    const tableOutput = document.getElementById('table-output');
    const metricsOutput = document.getElementById('metrics-output');
    const statusBadge = document.getElementById('status-badge');
    const algoDescText = document.getElementById('algo-desc-text');
    const algoFormula = document.getElementById('algo-formula');

    // Comparison View Elements
    const dashboardGrid = document.getElementById('dashboard-grid');
    const comparisonView = document.getElementById('comparison-view');
    const btnCompare = document.getElementById('btn-compare');
    const btnBackDashboard = document.getElementById('btn-back-dashboard');
    const compareControls = document.getElementById('compare-controls');

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
        priorityHeader.textContent = "PRIORITY";
        inputs.forEach(input => {
            input.setAttribute('max', '9');
            input.placeholder = "0-9";
            if (parseInt(input.value) > 9) input.value = 9;
        });
    }

    function addProcessRow() {
        const clone = rowTemplate.content.cloneNode(true);
        const row = clone.querySelector('.process-row');
        row.querySelector('.input-pid').value = pidCounter++;

        const extraWrapper = row.querySelector('.input-extra-wrapper');
        toggleExtraField(extraWrapper);

        // --- NEW LOGIC: Set default value based on algorithm ---
        const prioInput = row.querySelector('.input-priority');
        const needsPriority = ['priority', 'cfs'].includes(currentAlgo);
        const prioWrapper = prioInput.closest('.input-wrapper');

        if (needsPriority) prioWrapper.classList.remove('hidden');
        else prioWrapper.classList.add('hidden');

        prioInput.setAttribute('max', '9');
        prioInput.value = 0; // Default Priority = 0

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
        const needsExtra = ['edf', 'rms', 'propshare'].includes(currentAlgo);
        if (needsExtra) element.classList.remove('hidden');
        else element.classList.add('hidden');
    }

    function togglePriorityField(show) {
        if (show) priorityHeader.classList.remove('hidden');
        else priorityHeader.classList.add('hidden');

        const inputs = processList.querySelectorAll('.input-priority');
        inputs.forEach(input => {
            const wrapper = input.closest('.input-wrapper');
            if (show) wrapper.classList.remove('hidden');
            else wrapper.classList.add('hidden');
        });
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

        // Update Header Text based on Algo
        // Update Header Text based on Algo
        if (algoName === 'edf') {
            extraParamHeader.textContent = "Deadline";
        } else if (algoName === 'rms') {
            extraParamHeader.textContent = "Period";
        } else if (algoName === 'propshare') {
            extraParamHeader.textContent = "Tickets";
        } else {
            extraParamHeader.textContent = "Extra";
        }

        const extraWrappers = processList.querySelectorAll('.input-extra-wrapper');
        extraWrappers.forEach(toggleExtraField);

        // 4. Handle Priority Field Visibility
        const needsPriority = ['priority', 'cfs'].includes(algoName);
        togglePriorityField(needsPriority);

        // 5. Handle Global Settings (TQ for RR)
        if (algoName === 'rr') {
            globalSettings.classList.remove('hidden');
        } else {
            globalSettings.classList.add('hidden');
        }

        // 5. Update Priority/Ticket Column (Handles the default 1 logic)
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
            if (['edf', 'rms', 'propshare'].includes(currentAlgo)) {
                p.extraParam = parseInt(row.querySelector('.input-extra').value) || 0;
            }
            processes.push(p);
        });

        // Special handling for RR: Pass TQ in first process's extraParam
        if (currentAlgo === 'rr' && processes.length > 0) {
            const tq = parseInt(document.getElementById('time-quantum').value) || 2;
            processes[0].extraParam = tq;
        }

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

        // SAVE RESULTS FOR COMPARISON (always latest run)
        simulationResults[currentAlgo] = avgs;

        updateStatus('ready', 'Simulation Completed');
    }

    // --- Chart Logic --- //

    function createChart(ctxId, label, labels, data) {
        const ctx = document.getElementById(ctxId).getContext('2d');
        if (charts[ctxId]) charts[ctxId].destroy();
        charts[ctxId] = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{ label: label, data: data, backgroundColor: 'rgba(59, 130, 246, 0.6)', borderColor: 'rgba(59, 130, 246, 1)', borderWidth: 1 }]
            },
            options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true } } }
        });
    }

    function renderCharts() {
        const activeAlgos = ALGO_ORDER.filter(algo => simulationResults[algo] !== undefined);
        const labels = activeAlgos.map(algo => algo.toUpperCase());

        const wtData = activeAlgos.map(algo => parseFloat(simulationResults[algo].avg_wt));
        const tatData = activeAlgos.map(algo => parseFloat(simulationResults[algo].avg_tat));
        const rtData = activeAlgos.map(algo => parseFloat(simulationResults[algo].avg_rt));
        const cpuData = activeAlgos.map(algo => parseFloat(simulationResults[algo].cpu_util.replace('%', '')));
        const thruData = activeAlgos.map(algo => parseFloat(simulationResults[algo].throughput.split(' ')[0]));

        createChart('chart-wt', 'Average Waiting Time (sec)', labels, wtData);
        createChart('chart-tat', 'Average Turnaround Time (sec)', labels, tatData);
        createChart('chart-rt', 'Average Response Time (sec)', labels, rtData);
        createChart('chart-cpu', 'CPU Utilization (%)', labels, cpuData);
        createChart('chart-thru', 'Throughput (processes/sec)', labels, thruData);
    }

    function toggleComparisonView(show) {
        if (show) {
            dashboardGrid.classList.add('hidden');
            comparisonView.classList.remove('hidden');
            compareControls.classList.remove('hidden');
            algoTitle.textContent = "Algorithm Comparison";
        } else {
            dashboardGrid.classList.remove('hidden');
            comparisonView.classList.add('hidden');
            compareControls.classList.add('hidden');
            algoTitle.textContent = ALGO_CONTENT[currentAlgo].title;
        }
    }

    // --- Listeners ---
    menuItems.forEach(item => {
        if (!item.classList.contains('special-item')) {
            item.addEventListener('click', (e) => switchAlgorithm(e.target.closest('.menu-item').dataset.algo));
        }
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

    // Comparison Listeners
    btnCompare.addEventListener('click', () => {
        const resultsCount = Object.keys(simulationResults).length;
        if (resultsCount >= 2) {
            toggleComparisonView(true);
            renderCharts();
        } else {
            alert(`Need at least 2 simulated algorithms to compare. Currently have ${resultsCount}.`);
        }
    });

    btnBackDashboard.addEventListener('click', () => {
        toggleComparisonView(false);
    });

    // Init
    switchAlgorithm(currentAlgo);
    addProcessRow();
    addProcessRow();
    addProcessRow();
});