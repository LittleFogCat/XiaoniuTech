<#
.SYNOPSIS
  Start or restart the frontend + backend dev servers.

.DESCRIPTION
  - Launch the backend (`npm run dev` in backend/) and the frontend
    (`npm run dev` in frontend/) in two separate PowerShell windows
    so they keep running after this script returns.
  - Track the spawned PIDs in tmp/dev-pids.txt so a subsequent
    `rundev.ps1 -r` can stop the old processes before starting fresh
    ones.
  - Designed to be invoked from anywhere: the script resolves the
    repo root from its own location.

.PARAMETER Restart
  Stop the previously-spawned dev servers (if any) before starting
  new ones.

.PARAMETER Help
  Show this help text.

.EXAMPLE
  pwsh ./script/rundev.ps1
  pwsh ./script/rundev.ps1 -r
  pwsh ./script/rundev.ps1 -h
#>

[CmdletBinding()]
param(
  [switch]$Restart,
  [switch]$Help
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$RepoRoot = Resolve-Path (Join-Path $ScriptDir '..')
$BackendDir = Join-Path $RepoRoot 'backend'
$FrontendDir = Join-Path $RepoRoot 'frontend'
$TmpDir = Join-Path $RepoRoot 'tmp'
$PidFile = Join-Path $TmpDir 'dev-pids.txt'

function Show-Usage {
  @(
    'Usage: rundev.ps1 [-r] [-h]',
    '',
    'Options:',
    '  -r   Restart: stop previously-spawned dev servers before starting.',
    '  -h   Show this help message.',
    '',
    'Behavior:',
    '  - Spawns two PowerShell windows running `npm run dev` in backend/ and frontend/.',
    '  - Writes spawned PIDs to tmp/dev-pids.txt for later restart / cleanup.'
  ) | ForEach-Object { Write-Host $_ }
}

function Get-ExistingPids {
  if (-not (Test-Path $PidFile)) {
    return @()
  }
  $raw = Get-Content $PidFile -ErrorAction SilentlyContinue
  if (-not $raw) {
    return @()
  }
  return @($raw | Where-Object { $_ -match '^\d+$' })
}

function Stop-TrackedProcesses {
  param([int[]]$Pids)
  if (-not $Pids -or $Pids.Count -eq 0) {
    return
  }
  foreach ($processId in $Pids) {
    $proc = Get-Process -Id $processId -ErrorAction SilentlyContinue
    if (-not $proc) {
      Write-Host ("[rundev] pid {0} already gone, skipping." -f $processId)
      continue
    }
    try {
      Stop-Process -Id $processId -Force -ErrorAction Stop
      Write-Host ("[rundev] stopped pid {0} ({1})." -f $processId, $proc.ProcessName)
    } catch {
      Write-Warning ("[rundev] failed to stop pid {0}: {1}" -f $processId, $_.Exception.Message)
    }
  }
}

function Start-DevProcess {
  param(
    [Parameter(Mandatory = $true)][string]$WorkingDir,
    [Parameter(Mandatory = $true)][string]$Title
  )
  if (-not (Test-Path $WorkingDir)) {
    throw "Working directory not found: $WorkingDir"
  }
  $npmCmd = Get-Command npm.cmd -ErrorAction SilentlyContinue
  if (-not $npmCmd) {
    $npmCmd = Get-Command npm -ErrorAction SilentlyContinue
  }
  if (-not $npmCmd) {
    throw 'npm is not on PATH. Install Node.js first.'
  }
  $exe = $npmCmd.Source
  $quotedExe = '"' + $exe + '"'
  $quotedDir = '"' + $WorkingDir + '"'
  # PowerShell-native command: change location, then run npm.
  $command = "Set-Location -LiteralPath $quotedDir; & $quotedExe run dev"
  Write-Host ("[rundev] launching [{0}] in {1}" -f $Title, $WorkingDir)
  $proc = Start-Process -FilePath powershell.exe `
                         -ArgumentList @('-NoExit', '-Command', $command) `
                         -WindowStyle Normal `
                         -WorkingDirectory $WorkingDir `
                         -PassThru
  return $proc.Id
}

if ($Help) {
  Show-Usage
  exit 0
}

if (-not (Test-Path $TmpDir)) {
  New-Item -ItemType Directory -Path $TmpDir | Out-Null
}

if ($Restart) {
  $existing = Get-ExistingPids
  if ($existing.Count -gt 0) {
    Write-Host ("[rundev] restarting: stopping {0} tracked process(es)..." -f $existing.Count)
    Stop-TrackedProcesses -Pids $existing
  } else {
    Write-Host '[rundev] restart requested but no tracked processes found.'
  }
  # Give the OS a moment to release handles / ports.
  Start-Sleep -Milliseconds 600
  if (Test-Path $PidFile) {
    Remove-Item $PidFile -Force
  }
} else {
  $existing = Get-ExistingPids
  $alive = @($existing | Where-Object {
    $null -ne (Get-Process -Id $_ -ErrorAction SilentlyContinue)
  })
  if ($alive.Count -gt 0) {
    Write-Host ('[rundev] dev servers already running (pid: ' + ($alive -join ', ') + ').')
    Write-Host '[rundev] re-run with -r to restart them.'
    exit 0
  }
  if (Test-Path $PidFile) {
    Remove-Item $PidFile -Force
  }
}

$backendPid = Start-DevProcess -WorkingDir $BackendDir -Title 'backend'
$frontendPid = Start-DevProcess -WorkingDir $FrontendDir -Title 'frontend'

@($backendPid, $frontendPid) | ForEach-Object { "$_" } | Set-Content -Path $PidFile -Encoding utf8

Write-Host ''
Write-Host '[rundev] dev servers started:'
Write-Host ("  backend  pid={0}  dir={1}" -f $backendPid, $BackendDir)
Write-Host ("  frontend pid={0}  dir={1}" -f $frontendPid, $FrontendDir)
Write-Host ("[rundev] PIDs written to {0}" -f $PidFile)
Write-Host '[rundev] tip: re-run with -r to restart, or close the windows to stop them.'
