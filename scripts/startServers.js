const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const rootDir = path.join(__dirname, '..');
const logsDir = path.join(rootDir, 'logs');

fs.mkdirSync(logsDir, { recursive: true });

const services = [
  {
    name: 'pedagogical',
    script: path.join(rootDir, 'ms1-pedagogical', 'src', 'grpc-server.js')
  },
  {
    name: 'tracking',
    script: path.join(rootDir, 'ms2-tracking', 'trackingMicroservice.js')
  },
  {
    name: 'certification',
    script: path.join(rootDir, 'ms3-certification', 'certificationMicroservice.js')
  },
  {
    name: 'gateway',
    script: path.join(rootDir, 'gateway', 'apiGateway.js')
  }
];

for (const service of services) {
  const out = fs.openSync(path.join(logsDir, `${service.name}.out.log`), 'a');
  const err = fs.openSync(path.join(logsDir, `${service.name}.err.log`), 'a');
  const child = spawn(process.execPath, [service.script], {
    cwd: rootDir,
    detached: true,
    stdio: ['ignore', out, err],
    windowsHide: true
  });

  child.unref();
  console.log(`${service.name} started with PID ${child.pid}`);
}
