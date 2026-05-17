const { exec } = require('child_process');
const os = require('os');

const ports = [3000, 50051, 50052, 50053];

ports.forEach(port => {
  if (os.platform() === 'win32') {
    exec(`netstat -ano | findstr :${port}`, (error, stdout, stderr) => {
      if (!stdout) return;
      
      const lines = stdout.split('\n');
      lines.forEach(line => {
        const parts = line.trim().split(/\s+/);
        if (parts.length >= 5 && parts[1].endsWith(`:${port}`)) {
          const pid = parts[parts.length - 1];
          if (pid && pid !== '0') {
            exec(`taskkill /PID ${pid} /F`, () => {
              console.log(`Killed process ${pid} on port ${port}`);
            });
          }
        }
      });
    });
  } else {
    exec(`lsof -i :${port} -t`, (error, stdout, stderr) => {
      if (!stdout) return;
      const pids = stdout.trim().split('\n');
      pids.forEach(pid => {
        if (pid) {
          exec(`kill -9 ${pid}`, () => {
            console.log(`Killed process ${pid} on port ${port}`);
          });
        }
      });
    });
  }
});
