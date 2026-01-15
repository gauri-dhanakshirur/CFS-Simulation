import os
import subprocess
import re
import platform
from flask import Flask, render_template, request, jsonify

app = Flask(__name__)

# Path to your C project root directory relative to this script
C_PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))

# Determine executable path based on OS
if platform.system() == 'Windows':
    EXECUTABLE_PATH = os.path.join(C_PROJECT_ROOT, 'build', 'Debug', 'scheduler.exe')
else:
    EXECUTABLE_PATH = os.path.join(C_PROJECT_ROOT, 'build', 'scheduler')

print(f"Creating server. Expecting C executable at: {EXECUTABLE_PATH}")

# Map algorithm names to their IDs in the C program
ALGO_MAP = {
    'fcfs': 1, 'priority': 2, 'sjf': 3, 'rr': 4, 'mlfq': 5,
    'edf': 6, 'propshare': 7, 'rms': 8, 'cfs': 9
}

@app.route('/')
def index():
    """Serves the main dashboard page."""
    return render_template('index.html')

def parse_c_output(output_text):
    """Parses the fixed-width text table from the C program into a list of dictionaries."""
    lines = output_text.strip().split('\n')
    results = []
    averages = {}
    
    # Regex to find the table header line (e.g., "PID   AT   BT...")
    header_regex = re.compile(r'PID\s+AT\s+BT\s+WT\s+TAT\s+RT')
    
    in_table = False
    for line in lines:
        # Detect start of table content
        if header_regex.search(line):
            in_table = True
            continue
        
        # Parse table rows
        if in_table:
            # Match lines starting with a digit (a PID)
            if re.match(r'^\s*\d+', line):
                parts = tuple(map(str.strip, line.strip().split('\t')))
                if len(parts) >= 6:
                    results.append({
                        'pid': parts[0], 'at': parts[1], 'bt': parts[2],
                        'wt': parts[3], 'tat': parts[4], 'rt': parts[5]
                    })
            else:
                # If we hit a non-digit line after being in the table, the table is done.
                if len(results) > 0:
                    in_table = False
        
        # Parse summary statistics
        if not in_table:
            if 'Average Waiting Time' in line:
                averages['avg_wt'] = line.split('=')[1].strip()
            elif 'Average Turnaround Time' in line:
                averages['avg_tat'] = line.split('=')[1].strip()
            elif 'Average Response Time' in line:
                averages['avg_rt'] = line.split('=')[1].strip()
            elif 'CPU Utilization' in line:
                averages['cpu_util'] = line.split('=')[1].strip()
            elif 'Throughput' in line:
                averages['throughput'] = line.split('=')[1].strip()

    return {'processes': results, 'averages': averages}


@app.route('/api/simulate', methods=['POST'])
def simulate():
    if not os.path.exists(EXECUTABLE_PATH):
        return jsonify({'error': f"Executable not found at {EXECUTABLE_PATH}"}), 500

    data = request.json
    # Default to 1 (FCFS) if missing
    algo_id = ALGO_MAP.get(data.get('algorithm'), 1) 
    processes = data.get('processes', [])

    # --- 1. Construct Input String ---
    input_str = f"{len(processes)}\n"
    for p in processes:
        # Always send the first 3 parameters
        line = f"{p['arrival']} {p['burst']} {p['priority']}"
        
        # Only send the 4th parameter if the C code specifically asks for it.
        # Based on the main.c: 6=EDF, 8=RMS. 
        # CFS (9) does NOT read a 4th parameter from input.
        if algo_id == 6 or algo_id == 8:
            # Use .get() with default 0 to be safe
            extra = p.get('extraParam', 0)
            line += f" {extra}"
        
        input_str += line + "\n"

    try:
        # --- 2. Run C Executable ---
        process = subprocess.Popen(
            [EXECUTABLE_PATH, str(algo_id)], # Pass algo_id as argument
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        
        # Write input to stdin and get output
        stdout_data, stderr_data = process.communicate(input=input_str, timeout=10)

        # Check for C program crashes (segfaults, etc.)
        if process.returncode != 0:
            return jsonify({'error': f"Simulation Crashed (Code {process.returncode}): {stderr_data}"}), 400

        # --- 3. Parse Output ---
        parsed_results = parse_c_output(stdout_data)
        
        # If parsing failed (empty results), return the raw stdout for debugging
        if not parsed_results['processes']:
            print("DEBUG: Raw C Output:", stdout_data)
            return jsonify({'error': "Simulation ran but produced no valid output table."}), 500

        return jsonify(parsed_results)

    except subprocess.TimeoutExpired:
        process.kill()
        return jsonify({'error': "Simulation Timed Out. Input mismatch likely."}), 504
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    # Run the Flask app
    app.run(debug=True, port=5000)