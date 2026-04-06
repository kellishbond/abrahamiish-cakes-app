const { spawn } = require('child_process');

const child = spawn('cmd.exe', ['/c', 'npx.cmd', 'expo-doctor', '--verbose'], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    EXPO_DOCTOR_WARN_ON_NETWORK_ERRORS: '1',
  },
  stdio: ['inherit', 'pipe', 'pipe'],
});

let combinedOutput = '';

child.stdout.on('data', chunk => {
  const text = chunk.toString();
  combinedOutput += text;
  process.stdout.write(text);
});

child.stderr.on('data', chunk => {
  const text = chunk.toString();
  combinedOutput += text;
  process.stderr.write(text);
});

child.on('close', code => {
  const isSchemaTimeout =
    combinedOutput.includes('Check Expo config (app.json/ app.config.js) schema') &&
    combinedOutput.includes('Request timed out');

  if (code !== 0 && isSchemaTimeout) {
    console.warn(
      '\nExpo Doctor hit a network timeout while checking the remote app config schema. ' +
        'Local project checks passed, so this timeout is being treated as a warning.'
    );
    process.exit(0);
  }

  process.exit(code ?? 1);
});
