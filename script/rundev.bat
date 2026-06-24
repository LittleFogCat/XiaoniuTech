@echo off
rem Wrapper around rundev.ps1 so `rundev` works from any shell.
rem Usage: rundev [-r] [-h]

setlocal
set "SCRIPT_DIR=%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT_DIR%rundev.ps1" %*
endlocal
