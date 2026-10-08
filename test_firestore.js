import fs from 'fs';
const envFile = fs.readFileSync('.env.local', 'utf-8');
const env = {};
envFile.split('\n').forEach(line => {
  const [key, ...val] = line.split('=');
  if (key && val.length) {
    env[key.trim()] = val.join('=').trim().replace(/"/g, '');
  }
});

console.log("Found env keys:", Object.keys(env));
