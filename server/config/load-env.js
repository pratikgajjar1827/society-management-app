const fs = require('node:fs');
const path = require('node:path');

function getCandidateFiles() {
  const nodeEnv = String(process.env.NODE_ENV ?? '').trim();
  const files = ['.env'];

  if (nodeEnv) {
    files.push(`.env.${nodeEnv}`);
  }

  files.push('.env.local');

  if (nodeEnv) {
    files.push(`.env.${nodeEnv}.local`);
  }

  return files;
}

function stripWrappingQuotes(value) {
  if (value.length >= 2) {
    const first = value[0];
    const last = value[value.length - 1];
    if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
      return value.slice(1, -1);
    }
  }

  return value;
}

function parseEnvLine(line) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) {
    return null;
  }

  const separatorIndex = trimmed.indexOf('=');
  if (separatorIndex === -1) {
    return null;
  }

  const key = trimmed.slice(0, separatorIndex).trim();
  if (!key || !/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) {
    return null;
  }

  const rawValue = trimmed.slice(separatorIndex + 1).trim();
  return [key, stripWrappingQuotes(rawValue)];
}

function loadEnv() {
  const projectRoot = path.resolve(__dirname, '..', '..');
  const inheritedKeys = new Set(Object.keys(process.env));

  for (const fileName of getCandidateFiles()) {
    const filePath = path.join(projectRoot, fileName);
    if (!fs.existsSync(filePath)) {
      continue;
    }

    const contents = fs.readFileSync(filePath, 'utf8');
    for (const line of contents.split(/\r?\n/)) {
      const parsed = parseEnvLine(line);
      if (!parsed) {
        continue;
      }

      const [key, value] = parsed;
      if (!inheritedKeys.has(key)) {
        process.env[key] = value;
      }
    }
  }
}

loadEnv();
