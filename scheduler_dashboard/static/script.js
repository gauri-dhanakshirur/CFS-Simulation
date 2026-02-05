document.addEventListener('DOMContentLoaded', () => {
    let currentAlgo = 'cfs';
    let pidCounter = 1;

    // --- Metrics Storage for Comparison ---
    const ALGO_ORDER = ['cfs', 'edf', 'fcfs', 'mlfq', 'priority', 'propshare', 'rms', 'rr', 'sjf'];
    const ALGO_COLORS = {
        'cfs': '#ef4444',       // Red
        'edf': '#f97316',       // Orange
        'fcfs': '#f59e0b',      // Amber
        'mlfq': '#84cc16',      // Lime
        'priority': '#22c55e',  // Green
        'propshare': '#06b6d4', // Cyan
        'rms': '#3b82f6',       // Blue
        'rr': '#6366f1',        // Indigo
        'sjf': '#a855f7'        // Purple
    };
    const simulationResults = {}; // { algoName: { avg_wt, avg_tat, ... } }
    const algoDataCache = {}; // { algoName: { full simulation data } }
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

    // Modal Elements
    const expandModal = document.getElementById('expand-modal');
    const modalTitle = document.getElementById('modal-title');
    const modalContent = document.getElementById('modal-content');
    const modalOverlay = document.querySelector('.modal-overlay');
    const btnCloseModal = document.querySelector('.btn-close-modal');

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

    const METRIC_EXPLANATIONS = {
        'wt': {
            title: 'Average Waiting Time',
            desc: '<p>The average amount of time processes spend waiting in the ready queue before getting the CPU.</p><p><strong>Why it matters:</strong> Lower waiting time means the scheduler is more efficient at keeping processes moving.</p><p><strong>Formula:</strong> &Sigma; (Start Time - Arrival Time) / N</p>'
        },
        'tat': {
            title: 'Average Turnaround Time',
            desc: '<p>The average total time taken from process submission to completion.</p><p><strong>Why it matters:</strong> This is the key metric for user experience - how long until my job is done?</p><p><strong>Formula:</strong> &Sigma; (Completion Time - Arrival Time) / N</p>'
        },
        'rt': {
            title: 'Average Response Time',
            desc: '<p>The average time from submission until the process gets the CPU for the <em>first</em> time.</p><p><strong>Why it matters:</strong> Crucial for interactive systems. Users want instant feedback (low response time) even if the task takes longer to finish.</p><p><strong>Formula:</strong> &Sigma; (First Run Time - Arrival Time) / N</p>'
        },
        'cpu': {
            title: 'CPU Utilization',
            desc: '<p>The percentage of time the CPU was busy executing processes vs. being idle.</p><p><strong>Why it matters:</strong> We want to keep the CPU as busy as possible (close to 100%) to maximize resource usage.</p>'
        },
        'thru': {
            title: 'Throughput',
            desc: '<p>The number of processes completed per unit of time.</p><p><strong>Why it matters:</strong> High throughput means the system is completing more work in less time.</p><p><strong>Formula:</strong> N / Total Time</p>'
        },
        'fairness': {
            title: 'Jain\'s Fairness Index',
            desc: '<p>A quantitative measure of how fairly the CPU time is distributed among processes.</p><p><strong>Range:</strong> 0 to 1 (where 1 is perfectly fair).</p><p><strong>Why it matters:</strong> In a fair system (like CFS), all processes should receive an equal share of the CPU relative to their weight.</p><p><strong>Formula:</strong> J = (&Sigma;x<sub>i</sub>)<sup>2</sup> / (n &times; &Sigma;x<sub>i</sub><sup>2</sup>), where x<sub>i</sub> is the CPU time received by process i, and n is the number of processes.</p>'
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

        // 1. Update Title Link and Active Menu
        const algoLink = document.getElementById('algo-link');
        if (algoLink) {
            algoLink.textContent = content.title;
            algoLink.href = `/algorithm/${algoName}`;
        } else {
            algoTitle.textContent = content.title;
        }
        menuItems.forEach(item => item.classList.remove('active'));
        document.querySelector(`[data-algo="${algoName}"]`).classList.add('active');

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

        // 5. Restore cached results or reset if no data
        restoreOrResetResults(algoName);
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

        // Clear Gantt chart
        const ganttOutput = document.getElementById('gantt-output');
        if (ganttOutput) {
            ganttOutput.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">📉</div>
                    <p>Run simulation to view Gantt chart</p>
                </div>`;
        }

        // Clear VRuntime chart and hide card
        const vruntimeCard = document.getElementById('vruntime-card');
        if (vruntimeCard) {
            vruntimeCard.classList.add('hidden');
            if (charts['chart-vruntime']) {
                charts['chart-vruntime'].destroy();
                delete charts['chart-vruntime'];
            }
        }

        // Reset Fairness score
        const fairnessScore = document.getElementById('fairness-score');
        if (fairnessScore) {
            fairnessScore.textContent = '—';
            fairnessScore.className = 'fairness-score';
        }

        updateStatus('ready', 'System Ready');
    }

    // Restore cached results for an algorithm, or reset if no cached data
    function restoreOrResetResults(algoName) {
        const cached = algoDataCache[algoName];
        if (cached) {
            // Restore from cache
            renderResults(cached);
            updateStatus('ready', 'Restored previous results');
        } else {
            // No cached data, show empty state
            resetResults();
        }
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
        // Render process table
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

        // Render metrics (without fairness - it has its own card now)
        metricsOutput.innerHTML = `
            <ul class="metrics-list">
                <li><span class="metric-label">Avg Wait Time</span> <span class="metric-value">${avgs.avg_wt}</span></li>
                <li><span class="metric-label">Avg Turnaround</span> <span class="metric-value">${avgs.avg_tat}</span></li>
                <li><span class="metric-label">Avg Response</span> <span class="metric-value">${avgs.avg_rt}</span></li>
                <li><span class="metric-label">CPU Utilization</span> <span class="metric-value">${avgs.cpu_util}</span></li>
                <li><span class="metric-label">Throughput</span> <span class="metric-value">${avgs.throughput}</span></li>
            </ul>`;

        // Render Fairness Score
        updateFairnessScore(avgs.fairness_index);

        // Render Gantt Chart
        if (data.gantt && data.gantt.length > 0) {
            renderGanttChart(data.gantt);
        } else {
            document.getElementById('gantt-output').innerHTML = '<div class="empty-state"><p>No Gantt data available</p></div>';
        }

        // Render VRuntime Chart (CFS only)
        const vruntimeCard = document.getElementById('vruntime-card');
        if (data.vruntime && data.vruntime.length > 0 && currentAlgo === 'cfs') {
            vruntimeCard.classList.remove('hidden');
            renderVRuntimeChart(data.vruntime);
        } else {
            vruntimeCard.classList.add('hidden');
        }

        // SAVE RESULTS FOR COMPARISON (always latest run)
        simulationResults[currentAlgo] = avgs;

        // Cache full data for algorithm switching
        algoDataCache[currentAlgo] = data;

        updateStatus('ready', 'Simulation Completed');
    }

    // --- Gantt Chart Visualization ---
    function renderGanttChart(ganttData) {
        if (!ganttData || ganttData.length === 0) return;

        // Find timeline bounds
        const maxTime = Math.max(...ganttData.map(g => g.end));
        const pids = [...new Set(ganttData.map(g => g.pid))].sort((a, b) => a - b);

        // Build Gantt chart HTML
        let html = '<div class="gantt-chart">';

        pids.forEach(pid => {
            const events = ganttData.filter(g => g.pid === pid);
            html += `<div class="gantt-row">`;
            html += `<div class="gantt-label">P${pid}</div>`;
            html += `<div class="gantt-bars">`;

            events.forEach(event => {
                const left = (event.start / maxTime) * 100;
                const width = ((event.end - event.start) / maxTime) * 100;
                const colorClass = `gantt-p${((pid - 1) % 9) + 1}`;
                html += `<div class="gantt-block ${colorClass}" style="left: ${left}%; width: ${width}%" title="P${pid}: ${event.start}-${event.end}">${event.end - event.start > 1 ? (event.end - event.start) : ''}</div>`;
            });

            html += `</div></div>`;
        });

        html += '</div>';

        // Add timeline labels
        html += '<div class="gantt-timeline">';
        for (let t = 0; t <= maxTime; t += Math.max(1, Math.floor(maxTime / 10))) {
            html += `<span>${t}</span>`;
        }
        html += `<span>${maxTime}</span>`;
        html += '</div>';

        // Add legend
        html += '<div class="gantt-legend">';
        pids.forEach(pid => {
            const colorClass = `gantt-p${((pid - 1) % 9) + 1}`;
            html += `<div class="legend-item"><div class="legend-color ${colorClass}"></div><span>Process ${pid}</span></div>`;
        });
        html += '</div>';

        document.getElementById('gantt-output').innerHTML = html;
    }

    // --- VRuntime Chart (CFS Signature) ---
    function renderVRuntimeChart(vruntimeData) {
        if (!vruntimeData || vruntimeData.length === 0) return;

        const ctx = document.getElementById('chart-vruntime').getContext('2d');

        // Destroy existing chart if any
        if (charts['chart-vruntime']) {
            charts['chart-vruntime'].destroy();
        }

        // Group data by PID
        const pidData = {};
        vruntimeData.forEach(entry => {
            if (!pidData[entry.pid]) {
                pidData[entry.pid] = [];
            }
            pidData[entry.pid].push({ x: entry.time, y: entry.vruntime });
        });

        // Create datasets for each process
        const colors = ['#6366f1', '#ec4899', '#14b8a6', '#f59e0b', '#8b5cf6', '#ef4444', '#22c55e', '#06b6d4', '#f97316'];
        const datasets = Object.keys(pidData).map((pid, index) => ({
            label: `P${pid}`,
            data: pidData[pid],
            borderColor: colors[index % colors.length],
            backgroundColor: colors[index % colors.length] + '20',
            fill: false,
            tension: 0.1,
            pointRadius: 2,
            borderWidth: 2
        }));

        charts['chart-vruntime'] = new Chart(ctx, {
            type: 'line',
            data: { datasets },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Virtual Runtime Convergence - Lower weight = Faster vruntime growth',
                        font: { size: 12 }
                    },
                    legend: {
                        position: 'bottom'
                    }
                },
                scales: {
                    x: {
                        type: 'linear',
                        title: { display: true, text: 'Real Time (units)' }
                    },
                    y: {
                        title: { display: true, text: 'Virtual Runtime' },
                        beginAtZero: true
                    }
                }
            }
        });
    }

    // --- Fairness Score Display ---
    function updateFairnessScore(fairnessIndex) {
        const scoreEl = document.getElementById('fairness-score');
        if (!fairnessIndex || fairnessIndex === '—') {
            scoreEl.textContent = '—';
            scoreEl.className = 'fairness-score';
            return;
        }

        const score = parseFloat(fairnessIndex);
        scoreEl.textContent = score.toFixed(4);

        // Color code based on fairness level
        if (score >= 0.9) {
            scoreEl.className = 'fairness-score'; // Green (default)
        } else if (score >= 0.7) {
            scoreEl.className = 'fairness-score medium'; // Yellow/Orange
        } else {
            scoreEl.className = 'fairness-score low'; // Red
        }
    }

    // --- Chart Logic --- //

    function createChart(ctxId, label, labels, data, bgColors, borderColors) {
        const ctx = document.getElementById(ctxId).getContext('2d');
        if (charts[ctxId]) charts[ctxId].destroy();
        charts[ctxId] = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: label,
                    data: data,
                    backgroundColor: bgColors,
                    borderColor: borderColors,
                    borderWidth: 1
                }]
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

        // Generate color arrays
        const bgColors = activeAlgos.map(algo => ALGO_COLORS[algo] + '99'); // 60% opacity
        const borderColors = activeAlgos.map(algo => ALGO_COLORS[algo]);

        createChart('chart-wt', 'Average Waiting Time (sec)', labels, wtData, bgColors, borderColors);
        createChart('chart-tat', 'Average Turnaround Time (sec)', labels, tatData, bgColors, borderColors);
        createChart('chart-rt', 'Average Response Time (sec)', labels, rtData, bgColors, borderColors);
        createChart('chart-cpu', 'CPU Utilization (%)', labels, cpuData, bgColors, borderColors);
        createChart('chart-thru', 'Throughput (processes/sec)', labels, thruData, bgColors, borderColors);
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

    // Metric Explanations (Interactive Charts)
    document.querySelectorAll('[data-metric]').forEach(card => {
        card.addEventListener('click', () => {
            console.log('Card clicked:', card.dataset.metric);
            const metricKey = card.getAttribute('data-metric');
            if (metricKey && METRIC_EXPLANATIONS[metricKey]) {
                const info = METRIC_EXPLANATIONS[metricKey];
                modalTitle.textContent = info.title;
                modalContent.innerHTML = `<div class="modal-content-inner" style="font-size: 1.1rem; padding: 1rem;">${info.desc}</div>`;

                expandModal.classList.remove('hidden');
                document.body.style.overflow = 'hidden';
            }
        });
    });

    // --- Expandable Modal Logic ---
    // (Selectors moved to top)

    // Expand card when clicking expand button
    let modalChartInstance = null; // Track modal chart instance

    document.querySelectorAll('.btn-expand').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const card = btn.closest('.expandable-card');
            if (!card) return;

            const cardType = card.dataset.card;
            const title = card.querySelector('.card-header h3').textContent;
            const content = card.querySelector('.card-content');

            if (!content) return;

            // Set modal title
            modalTitle.textContent = title;

            // Handle VRuntime specially - need to recreate chart
            if (cardType === 'vruntime') {
                modalContent.innerHTML = '<div class="chart-wrapper modal-content-inner" style="height: 400px;"><canvas id="modal-chart-vruntime"></canvas></div>';

                // Get cached vruntime data
                const cachedData = algoDataCache[currentAlgo];
                if (cachedData && cachedData.vruntime && cachedData.vruntime.length > 0) {
                    // Wait for DOM to update, then create chart
                    setTimeout(() => {
                        const ctx = document.getElementById('modal-chart-vruntime').getContext('2d');

                        // Group data by PID
                        const pidData = {};
                        cachedData.vruntime.forEach(entry => {
                            if (!pidData[entry.pid]) {
                                pidData[entry.pid] = [];
                            }
                            pidData[entry.pid].push({ x: entry.time, y: entry.vruntime });
                        });

                        // Create datasets for each process
                        const colors = ['#6366f1', '#ec4899', '#14b8a6', '#f59e0b', '#8b5cf6', '#ef4444', '#22c55e', '#06b6d4', '#f97316'];
                        const datasets = Object.keys(pidData).map((pid, index) => ({
                            label: `P${pid}`,
                            data: pidData[pid],
                            borderColor: colors[index % colors.length],
                            backgroundColor: colors[index % colors.length] + '20',
                            fill: false,
                            tension: 0.1,
                            pointRadius: 3,
                            borderWidth: 3
                        }));

                        if (modalChartInstance) {
                            modalChartInstance.destroy();
                        }

                        modalChartInstance = new Chart(ctx, {
                            type: 'line',
                            data: { datasets },
                            options: {
                                responsive: true,
                                maintainAspectRatio: false,
                                plugins: {
                                    title: {
                                        display: true,
                                        text: 'Virtual Runtime Convergence - Lower weight = Faster vruntime growth',
                                        font: { size: 14 }
                                    },
                                    legend: {
                                        position: 'bottom'
                                    }
                                },
                                scales: {
                                    x: {
                                        type: 'linear',
                                        title: { display: true, text: 'Real Time (units)' }
                                    },
                                    y: {
                                        title: { display: true, text: 'Virtual Runtime' },
                                        beginAtZero: true
                                    }
                                }
                            }
                        });
                    }, 50);
                }
            } else {
                // Clone content into modal for non-chart cards
                modalContent.innerHTML = '';
                const clonedContent = content.cloneNode(true);
                clonedContent.classList.add('modal-content-inner');
                modalContent.appendChild(clonedContent);
            }

            // Show modal
            expandModal.classList.remove('hidden');
            document.body.style.overflow = 'hidden';
        });
    });

    // Close modal functions
    function closeModal() {
        expandModal.classList.add('hidden');
        document.body.style.overflow = '';
        if (modalChartInstance) {
            modalChartInstance.destroy();
            modalChartInstance = null;
        }
        modalContent.innerHTML = '';
    }

    if (btnCloseModal) {
        btnCloseModal.addEventListener('click', closeModal);
    }

    if (modalOverlay) {
        modalOverlay.addEventListener('click', closeModal);
    }

    // Close on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !expandModal.classList.contains('hidden')) {
            closeModal();
        }
    });

    // ============================================
    // HOME VIEW NAVIGATION
    // ============================================
    const homeView = document.getElementById('home-view');
    const menuHome = document.getElementById('menu-home');
    const brandHome = document.getElementById('brand-home');
    const btnStartSimulator = document.getElementById('btn-start-simulator');
    const topBar = document.querySelector('.top-bar');

    function showHomeView() {
        // Hide dashboard and comparision, show home
        dashboardGrid.classList.add('hidden');
        comparisonView.classList.add('hidden');
        homeView.classList.remove('hidden');
        topBar.style.display = 'none';

        // Update menu states
        menuItems.forEach(item => item.classList.remove('active'));
        menuHome.classList.add('active');
    }

    function showDashboardView(algoName = null) {
        // Show dashboard, hide home
        homeView.classList.add('hidden');
        comparisonView.classList.add('hidden');
        dashboardGrid.classList.remove('hidden');
        topBar.style.display = '';

        // Update menu states
        menuHome.classList.remove('active');

        if (algoName) {
            switchAlgorithm(algoName);
        }
    }

    // Logo click -> Home
    if (brandHome) {
        brandHome.addEventListener('click', showHomeView);
    }

    // Home menu item click -> Home
    if (menuHome) {
        menuHome.addEventListener('click', showHomeView);
    }

    // "Start with CFS" button -> Dashboard with CFS
    if (btnStartSimulator) {
        btnStartSimulator.addEventListener('click', () => {
            showDashboardView('cfs');
        });
    }

    // Algorithm menu items -> Dashboard with selected algo
    menuItems.forEach(item => {
        if (item.hasAttribute('data-algo')) {
            item.addEventListener('click', () => {
                const algo = item.getAttribute('data-algo');
                showDashboardView(algo);
            });
        }
    });

    // Init - Show home view by default
    addProcessRow();
    addProcessRow();
    addProcessRow();
    switchAlgorithm(currentAlgo); // Prepare CFS configuration
    showHomeView(); // Start on home page
});