from flask import Flask, request, jsonify
from flask_cors import CORS
import subprocess
import json
import os

app = Flask(__name__)
CORS(app) # Critical to allow dashboard.html to talk to this script

@app.route('/simulate', methods=['POST'])
def simulate():
    data = request.json
    
    # 1. Prepare input for your C program (PID AT BT Priority)
    input_str = f"{len(data['processes'])}\n"
    for p in data['processes']:
        input_str += f"{p['pid']} {p['at']} {p['bt']} {p['priority']}\n"

    try:
        # 2. Path to your binary based on your screenshot
        cwd = os.getcwd()
        binary_path = os.path.join(cwd, "build", "scheduler")
        
        # 3. Execute the C scheduler
        process = subprocess.Popen(
            [binary_path, str(data['algoId'])],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        stdout, stderr = process.communicate(input=input_str)

        # 4. Read the JSON results from your root directory
        with open("simulation_output.json", "r") as f:
            result = json.load(f)
            
        return jsonify(result)

    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    print("Bridge Engine Online on http://localhost:5000")
    app.run(port=5000)