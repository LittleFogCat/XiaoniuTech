@echo off
setlocal enabledelayedexpansion
for /f "tokens=2 delims==" %%a in ('wmic os get localdatetime /value') do set "dt=%%a"
set "timestamp=!dt:~0,8!_!dt:~8,6!"
set "logFile=%~dp0output\log_%timestamp%.log"
cd /d %~dp0
node src/index.js >> "%logFile%" 2>&1