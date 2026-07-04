@echo off
setlocal

powershell -ExecutionPolicy Bypass -File "%~dp0shell-examples\web-dev-decrypt.ps1"
exit /b %errorlevel%
