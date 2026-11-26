const { test } = require('node:test');
const { execFile } = require('node:child_process');
const { promisify } = require('node:util');

test('deployment ZIP is reproducible, contains runtime dependencies and rejects invalid metadata', async () => {
  await promisify(execFile)('python3', ['-c', `
import importlib.util, json, pathlib, tempfile, zipfile
spec = importlib.util.spec_from_file_location('deployment', 'scripts/package-deployment.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
sha = 'a' * 40
with tempfile.TemporaryDirectory(prefix='adopet-package-test-') as temporary:
    root = pathlib.Path(temporary)
    first = module.build(root / 'first.zip', sha)
    second = module.build(root / 'second.zip', sha)
    assert first.read_bytes() == second.read_bytes()
    with zipfile.ZipFile(first) as archive:
        names = archive.namelist()
        assert archive.testzip() is None
        assert 'src/server.js' in names
        assert 'node_modules/pg/package.json' in names
        assert 'node_modules/express/package.json' in names
        assert json.loads(archive.read('release.json'))['commit'] == sha
        assert not any(n.startswith(('node_modules/c8/', 'node_modules/nodemon/', 'test/', 'docs/', '.git/')) for n in names)
        assert not any(pathlib.PurePosixPath(n).name.startswith('.env') for n in names)
    try:
        module.build(root / 'invalid.zip', 'not-a-commit')
    except ValueError:
        pass
    else:
        raise AssertionError('Invalid release metadata was accepted')
`]);
});
