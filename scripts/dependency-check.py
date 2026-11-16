"""Run Dependency-Check without putting the NVD key in argv or logs."""

import os
from pathlib import Path
import re
import subprocess
import sys
import tempfile


def main():
    if len(sys.argv) != 3:
        print('Usage: dependency-check.py CLI_PATH DATA_DIRECTORY', file=sys.stderr)
        return 2

    key = os.environ.get('NVD_API_KEY', '')
    if not re.fullmatch(r'[A-Za-z0-9-]+', key):
        print('NVD_API_KEY is missing or invalid. Configure it as a secret variable.', file=sys.stderr)
        return 2

    reports = Path('reports/dependency-check')
    reports.mkdir(parents=True, exist_ok=True)
    # NamedTemporaryFile is private (0600) and removed even when the CLI fails.
    with tempfile.NamedTemporaryFile(mode='w', suffix='.properties') as properties:
        properties.write(f'nvd.api.key={key}\n')
        properties.flush()
        environment = os.environ.copy()
        environment.pop('NVD_API_KEY', None)
        result = subprocess.run([
            sys.argv[1], '--project', 'AdoPet Backend',
            '--scan', 'package.json', '--scan', 'package-lock.json',
            '--data', sys.argv[2], '--propertyfile', properties.name,
            '--format', 'HTML', '--format', 'JSON', '--format', 'SARIF',
            '--out', str(reports), '--failOnCVSS', '7',
            '--nvdValidForHours', '24',
        ], env=environment, check=False)
        return result.returncode


if __name__ == '__main__':
    sys.exit(main())
