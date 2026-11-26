"""Build a ready-to-run ZIP using only source and installed production dependencies."""
import argparse
import json
import os
from pathlib import Path
import re
import subprocess
import zipfile


def build(output, commit, root=None):
    root = Path(root or Path(__file__).resolve().parent.parent).resolve()
    if not re.fullmatch(r'[a-f0-9]{40}', commit):
        raise ValueError('A full source commit SHA is required')
    dependencies = subprocess.check_output(
        ['npm', 'ls', '--omit=dev', '--all', '--parseable'], cwd=root, text=True
    ).splitlines()
    files = {root / 'package.json', root / 'package-lock.json'}
    files.update((root / 'src').rglob('*.js'))
    for directory in dependencies:
        package = Path(directory)
        if package == root:
            continue
        if not package.resolve().is_relative_to(root / 'node_modules'):
            raise ValueError('Dependency outside node_modules')
        for current, dirs, names in os.walk(package, followlinks=False):
            for name in dirs:
                if (Path(current) / name).is_symlink():
                    raise ValueError('Symlink in dependency package')
            dirs[:] = [name for name in dirs if name != 'node_modules']
            files.update(Path(current) / name for name in names if not name.startswith('.env'))
    if root / 'src/server.js' not in files:
        raise ValueError('Server entry point missing')
    output = Path(output)
    output.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(output, 'w', compression=zipfile.ZIP_DEFLATED) as archive:
        for file in sorted(files):
            if file.is_symlink() or not file.resolve().is_relative_to(root):
                raise ValueError('Unsafe file in deployment package')
            info = zipfile.ZipInfo(file.relative_to(root).as_posix(), (2020, 1, 1, 0, 0, 0))
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = (file.stat().st_mode & 0xFFFF) << 16
            archive.writestr(info, file.read_bytes())
        metadata = zipfile.ZipInfo('release.json', (2020, 1, 1, 0, 0, 0))
        metadata.compress_type = zipfile.ZIP_DEFLATED
        metadata.external_attr = 0o100644 << 16
        archive.writestr(metadata, json.dumps({'commit': commit}) + '\n')
    return output


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--output', required=True)
    parser.add_argument('--commit', required=True)
    args = parser.parse_args()
    build(args.output, args.commit)
    print('Deployment ZIP created with production dependencies and release metadata.')
