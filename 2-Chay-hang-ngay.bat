@echo off
chcp 65001 >nul
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0windows\start-remote.ps1"
if errorlevel 1 pause
