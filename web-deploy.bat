@echo off
setlocal

pushd "%~dp0web" || exit /b 1
npm run deploy
set "exit_code=%errorlevel%"
popd

exit /b %exit_code%
