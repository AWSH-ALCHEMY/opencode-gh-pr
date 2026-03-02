
import subprocess
import sys

# Read the user and system prompts from files
with open('user_prompt.txt', 'r') as f:
    user_prompt = f.read()

with open('system_prompt.txt', 'r') as f:
    system_prompt = f.read()

# Construct the command
command = [
    'opencode',
    'run',
    user_prompt,
    '--prompt',
    system_prompt,
]

# Execute the command
result = subprocess.run(command, capture_output=True, text=True)

# Print the results
print("STDOUT:")
print(result.stdout)
print("STDERR:")
print(result.stderr)
print(f"Exit Code: {result.returncode}")
