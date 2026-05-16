@echo off
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3000 :50052 :50053"') do taskkill /PID %%a /F
