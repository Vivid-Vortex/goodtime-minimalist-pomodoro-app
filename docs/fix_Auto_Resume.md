fix_Auto_Resume — cheat sheet

This file lists the exact commands and edits run in today's session to install and fix claude-auto-resume on Windows (PowerShell), plus the two function replacements applied to claude-auto-resume.ps1.

1) Locate existing installation & help

Get-Command claude-auto-resume -ErrorAction SilentlyContinue | Format-List -Property *
where.exe claude-auto-resume 2>$null
claude-auto-resume --help

2) View the installed script (if present)

# Open the script file
# (path shown by Get-Command): C:\Users\Deepak\bin\claude-auto-resume.ps1

# (example) use PowerShell to open/view
Get-Content C:\Users\Deepak\bin\claude-auto-resume.ps1 | Out-Host

3) Install / place Windows files into %USERPROFILE%\bin

$dest=Join-Path $env:USERPROFILE 'bin'
New-Item -ItemType Directory -Force -Path $dest | Out-Null
Invoke-WebRequest -Uri 'https://raw.githubusercontent.com/terryso/claude-auto-resume/main/claude-auto-resume.ps1' -UseBasicParsing -OutFile (Join-Path $dest 'claude-auto-resume.ps1') -ErrorAction Stop
Invoke-WebRequest -Uri 'https://raw.githubusercontent.com/terryso/claude-auto-resume/main/claude-auto-resume.cmd' -UseBasicParsing -OutFile (Join-Path $dest 'claude-auto-resume.cmd') -ErrorAction Stop
Get-ChildItem $dest -Filter 'claude-auto-resume.*' | Format-Table Name,Length,FullName

4) Quick functional test (test-mode)

# Run the Windows wrapper in test-mode (simulates wait then runs command)
& (Join-Path $env:USERPROFILE 'bin\claude-auto-resume.cmd') --test-mode 3 -e "echo test"

This demonstrated the initial failure: process start failed because the script tried to start 'claude' using a working directory where the real binary wasn't found.

5) Inspect 'claude' command wrapper

Get-Command claude -ErrorAction SilentlyContinue | Format-List *

6) Patch the PowerShell script (two fixes applied)

A) Fix: Resolve the actual command path and fallback to cmd.exe when Start() fails.

Replace the existing Invoke-ProcessWithTimeout function with this block:

function Invoke-ProcessWithTimeout {
  param(
    [string]$FilePath,
    [string[]]$Arguments,
    [int]$TimeoutSeconds = 300
  )

  # Resolve command path if available (helps on Windows where wrappers may point to node_modules)
  try {
    $cmdInfo = Get-Command $FilePath -ErrorAction SilentlyContinue
    if ($cmdInfo) {
      if ($cmdInfo.Source) { $resolvedPath = $cmdInfo.Source }
      elseif ($cmdInfo.Path) { $resolvedPath = $cmdInfo.Path }
      else { $resolvedPath = $FilePath }
    } else {
      $resolvedPath = $FilePath
    }
  } catch {
    $resolvedPath = $FilePath
  }

  $psi = New-Object System.Diagnostics.ProcessStartInfo
  $psi.FileName = $resolvedPath
  $psi.Arguments = ($Arguments -join ' ')
  $psi.RedirectStandardOutput = $true
  $psi.RedirectStandardError = $true
  $psi.UseShellExecute = $false
  $psi.CreateNoWindow = $true

  $p = New-Object System.Diagnostics.Process
  $p.StartInfo = $psi
  try {
    $null = $p.Start()
  } catch {
    # Fallback for commands that require the shell (eg .cmd/.bat wrappers)
    if ($IsWindows) {
      $psi = New-Object System.Diagnostics.ProcessStartInfo
      $psi.FileName = 'cmd.exe'
      $psi.Arguments = '/c ' + ($FilePath + ' ' + ($Arguments -join ' ')).Trim()
      $psi.RedirectStandardOutput = $true
      $psi.RedirectStandardError = $true
      $psi.UseShellExecute = $false
      $psi.CreateNoWindow = $true
      $p = New-Object System.Diagnostics.Process
      $p.StartInfo = $psi
      $null = $p.Start()
    } else {
      throw
    }
  }

  $script:CLAUDE_PROCESS = $p

  if ($TimeoutSeconds -le 0) {
    $p.WaitForExit()
  } else {
    if (-not $p.WaitForExit($TimeoutSeconds * 1000)) {
      try { $p.Kill() } catch {}
      return @{ ExitCode = 124; Output = ($p.StandardOutput.ReadToEnd() + $p.StandardError.ReadToEnd()) }
    }
  }

  $out = $p.StandardOutput.ReadToEnd()
  $err = $p.StandardError.ReadToEnd()
  return @{ ExitCode = $p.ExitCode; Output = ($out + $err) }
}

How it helps: Get-Command resolves node/npm wrapper paths, and the cmd.exe fallback starts .cmd/.bat wrappers correctly.

B) Fix: Robust parsing for Claude's "resets" time (handles minutes and noisy encoding)

Replace Extract-NewFormatTimestamp with this block:

function Extract-NewFormatTimestamp {
  param([string]$ClaudeOutput)

  # Match times like 'resets 9pm', 'resets 9:30pm', possibly with surrounding text/encoding noise
  $pattern = 'resets\s*([0-9]{1,2}(?::[0-9]{2})?)\s*(am|pm)'
  $m = [regex]::Match($ClaudeOutput, $pattern, 'IgnoreCase')
  if (-not $m.Success) {
    # Try a more permissive pattern (handles cases like 'resets 21:30')
    $pattern2 = 'resets\s*([0-9]{1,2}:[0-9]{2})' 
    $m2 = [regex]::Match($ClaudeOutput, $pattern2, 'IgnoreCase')
    if ($m2.Success) {
      $timeStr = $m2.Groups[1].Value
      $dt = [datetime]::ParseExact($timeStr, 'H:mm', $null)
      $hour = $dt.Hour; $minute = $dt.Minute; $isPm = $false
    } else {
      Write-Host "[ERROR] Failed to extract reset time from new Claude output format."
      Write-Host "[HINT] Expected format: '... resets 9:30pm (Zone)' or similar."
      Write-Host "[SUGGESTION] Check if Claude CLI output format has changed."
      Write-Host "[DEBUG] Raw output: $ClaudeOutput"
      exit 2
    }
  } else {
    $timePart = $m.Groups[1].Value
    $period = $m.Groups[2].Value.ToLowerInvariant()
    if ($timePart -match ':') {
      $parts = $timePart -split ':'
      $hour = [int]$parts[0]
      $minute = [int]$parts[1]
    } else {
      $hour = [int]$timePart
      $minute = 0
    }
    $isPm = ($period -eq 'pm')

    if ($isPm) {
      if ($hour -ne 12) { $hour += 12 }
    } else {
      if ($hour -eq 12) { $hour = 0 }
    }
  }

  $now = Get-Date
  $todayReset = $now.Date.AddHours($hour).AddMinutes($minute)
  if ($now -gt $todayReset) {
    $resume = $todayReset.AddDays(1)
  } else {
    $resume = $todayReset
  }

  return [int64]([DateTimeOffset]$resume).ToUnixTimeSeconds()
}

7) Apply edits and re-run test

# After editing/
& (Join-Path $env:USERPROFILE 'bin\claude-auto-resume.cmd') --test-mode 3 -e "echo test"

8) Final usage

# Start in foreground (will wait until Claude resets and then resume automatically)
claude-auto-resume -p "continue"

# To run detached on Windows (background):
Start-Process -FilePath "$env:USERPROFILE\bin\claude-auto-resume.cmd" -ArgumentList '-p "continue"' -WindowStyle Hidden

Notes & troubleshooting

- Ensure the claude CLI is authenticated and in PATH: claude --version
- If you see messages about --dangerously-skip-permissions, update claude CLI or accept the warning; the script uses that flag for unattended resumes.
- If extraction fails again, copy/paste the exact raw claude check output line (the script prints it) so regex can be adjusted.

If you want, commit this file into the repo or I can open it for edits.
