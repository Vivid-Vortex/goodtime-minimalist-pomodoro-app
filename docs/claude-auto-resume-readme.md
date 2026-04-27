claude-auto-resume — README (extracted & adapted)

Summary

claude-auto-resume is a small utility that waits for Claude CLI usage limits to reset and then automatically resumes a task (or executes a custom shell command). It supports Linux/macOS (bash script) and Windows (PowerShell script + .cmd wrapper).

Security warning

This tool uses --dangerously-skip-permissions to allow unattended execution. It can run arbitrary shell commands. Use only in trusted environments.

Quick features

- Detects Claude usage limits and calculates resume time
- Shows countdown and resumes automatically
- Optionally executes a custom command after wait
- Test mode for quick validation

Installation (Linux/macOS)

# Method 1: wget (recommended)
wget -qO- https://raw.githubusercontent.com/terryso/claude-auto-resume/refs/heads/develop/claude-auto-resume.sh | sudo tee /usr/local/bin/claude-auto-resume >/dev/null && sudo chmod +x /usr/local/bin/claude-auto-resume

# Method 2: Makefile (global)
sudo make install

# Method 3: Manual
sudo cp claude-auto-resume.sh /usr/local/bin/claude-auto-resume
sudo chmod +x /usr/local/bin/claude-auto-resume

Installation (Windows — PowerShell)

# From repo root (run in PowerShell):
$dest = Join-Path $env:USERPROFILE 'bin'
New-Item -ItemType Directory -Force -Path $dest | Out-Null
Copy-Item .\claude-auto-resume.ps1, .\claude-auto-resume.cmd $dest

# Ensure %USERPROFILE%\bin is on PATH, then run:
claude-auto-resume --help

Setup checklist

1. Ensure Claude CLI is installed and authenticated: claude --version
2. Ensure the script is on PATH (or run via full path)
3. Start in foreground for interactive logs or in background via Start-Process

Usage examples

# Start new session with default prompt "continue"
claude-auto-resume

# Start new session with custom prompt
claude-auto-resume "implement user authentication"

# Continue previous conversation
claude-auto-resume -c "please continue the previous task"

# Execute custom command after wait
claude-auto-resume -e "npm run dev"

# Test mode (fast test)
claude-auto-resume --test-mode 5 -e "echo test"

Troubleshooting (Windows-specific fixes)

If the script fails with "The system cannot find the file specified" when starting the claude process, it is usually due to the PowerShell script trying to start a wrapper that requires cmd.exe. Use the patched Invoke-ProcessWithTimeout which:

- Resolves the real command path with Get-Command
- Falls back to cmd.exe /c when direct Process.Start fails

See docs/fix_Auto_Resume.md for a full cheat-sheet with the exact commands and the two function replacements applied during a local fix.

Original upstream repo

https://github.com/terryso/claude-auto-resume

Notes

- Keep claude CLI updated if the script warns about --dangerously-skip-permissions
- If parsing fails on the "resets" time (e.g., "resets 9:30pm"), update the regex in Extract-NewFormatTimestamp; docs/fix_Auto_Resume.md contains the robust version used during testing.
