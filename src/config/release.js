const fs = require('node:fs');
const path = require('node:path');

function releaseVersion() {
  try {
    const release = JSON.parse(fs.readFileSync(path.join(__dirname, '../../release.json'), 'utf8'));
    if (!/^[a-f0-9]{40}$/.test(release.commit)) throw new Error('Invalid release metadata');
    return release.commit;
  } catch (error) {
    if (error.code === 'ENOENT' && process.env.NODE_ENV !== 'production') return 'local';
    throw new Error('Missing or invalid release metadata');
  }
}

module.exports = releaseVersion;
