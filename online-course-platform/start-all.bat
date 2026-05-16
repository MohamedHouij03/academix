@echo off
cd /d "%~dp0"

start "MS2 Tracking" cmd /k "node ms2-tracking\trackingMicroservice.js"
start "MS3 Certification" cmd /k "node ms3-certification\certificationMicroservice.js"
start "API Gateway" cmd /k "node gateway\apiGateway.js"

echo Services started:
echo - MS2 Tracking: localhost:50052
echo - MS3 Certification: localhost:50053
echo - API Gateway: http://localhost:3000/graphql
