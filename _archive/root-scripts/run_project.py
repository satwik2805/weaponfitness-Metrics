import subprocess
import os
import time

# Kill existing python processes on 8000, 8001, 8002
subprocess.run("powershell -Command \"Stop-Process -Id (Get-NetTCPConnection -LocalPort 8000 -ErrorAction SilentlyContinue).OwningProcess -ErrorAction SilentlyContinue\"", shell=True)
subprocess.run("powershell -Command \"Stop-Process -Id (Get-NetTCPConnection -LocalPort 8001 -ErrorAction SilentlyContinue).OwningProcess -ErrorAction SilentlyContinue\"", shell=True)
subprocess.run("powershell -Command \"Stop-Process -Id (Get-NetTCPConnection -LocalPort 8002 -ErrorAction SilentlyContinue).OwningProcess -ErrorAction SilentlyContinue\"", shell=True)

# Start Backend on 8002
print("Starting Backend on 8002...")
backend_process = subprocess.Popen(
    ["python", "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8002"],
    cwd=os.path.join(os.getcwd(), "backend"),
    stdout=open("backend_log.txt", "w"),
    stderr=subprocess.STDOUT
)

# Start Expo
print("Starting Expo...")
expo_process = subprocess.Popen(
    ["npx", "expo", "start", "--clear"],
    stdout=open("expo_log.txt", "w"),
    stderr=subprocess.STDOUT
)

print("Project is starting. Check backend_log.txt and expo_log.txt for updates.")
time.sleep(10)
print("Startup sequence complete.")
