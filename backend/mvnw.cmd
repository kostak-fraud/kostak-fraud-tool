@echo off
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0maven-bootstrap.ps1" %*
exit /b %ERRORLEVEL%

