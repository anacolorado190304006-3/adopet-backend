const { test } = require('node:test');
const { execFile } = require('node:child_process');
const { promisify } = require('node:util');

const setup = `
import contextlib, importlib.util, io, os, pathlib, stat, sys, tempfile
from types import SimpleNamespace
from unittest.mock import patch
spec = importlib.util.spec_from_file_location('dependency_check', 'scripts/dependency-check.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
`;

test('OWASP wrapper preserves blocking exits, protects credentials and cleans temporary properties', async () => {
  await promisify(execFile)('python3', ['-c', setup + `
with tempfile.TemporaryDirectory(prefix='adopet-owasp-test-') as folder:
    os.chdir(folder)
    for code in [0, 14, 15, 13]:
        files = []
        def run(args, *, env, check):
            assert 'NVD_API_KEY' not in env
            assert 'fixture-value' not in str(args)
            assert args[args.index('--failOnCVSS') + 1] == '7'
            assert args[args.index('--nvdValidForHours') + 1] == '24'
            assert args[args.index('--nvdApiDelay') + 1] == '8000'
            assert args[args.index('--nvdMaxRetryCount') + 1] == '10'
            assert '--noupdate' not in args
            assert not any(arg.startswith('--disable') for arg in args)
            assert not any('SkipDev' in arg for arg in args)
            assert all(fmt in args for fmt in ['HTML', 'JSON', 'SARIF'])
            props = pathlib.Path(args[args.index('--propertyfile') + 1])
            assert stat.S_IMODE(props.stat().st_mode) == 0o600
            assert props.read_text().strip() == 'nvd.api.key=fixture-value'
            files.append(props)
            return SimpleNamespace(returncode=code)
        output = io.StringIO()
        with patch.dict(os.environ, {'NVD_API_KEY': 'fixture-value'}), patch.object(sys, 'argv', ['wrapper', 'cli', 'cache']), patch.object(module.subprocess, 'run', side_effect=run) as execute, contextlib.redirect_stderr(output):
            assert module.main() == code
        assert execute.call_count == 1
        assert all(not p.exists() for p in files)
        assert 'fixture-value' not in output.getvalue()
        assert ('NOT passed' in output.getvalue()) == (code == 14)
`]);
});

test('OWASP wrapper rejects absent or invalid secrets without invoking the analyzer', async () => {
  await promisify(execFile)('python3', ['-c', setup + `
for key in ['', 'invalid key', 'invalid' + chr(10) + 'setting=true']:
    output = io.StringIO()
    with patch.dict(os.environ, {'NVD_API_KEY': key}), patch.object(sys, 'argv', ['wrapper', 'cli', 'cache']), patch.object(module.subprocess, 'run') as execute, contextlib.redirect_stderr(output):
        assert module.main() == 2
    execute.assert_not_called()
    assert output.getvalue().strip() == 'NVD_API_KEY is missing or invalid. Configure it as a secret variable.'
`]);
});

test('OWASP temporary credential file is removed if launching the analyzer fails', async () => {
  await promisify(execFile)('python3', ['-c', setup + `
with tempfile.TemporaryDirectory(prefix='adopet-owasp-test-') as folder:
    os.chdir(folder)
    files = []
    def fail(args, **kwargs):
        files.append(pathlib.Path(args[args.index('--propertyfile') + 1]))
        raise FileNotFoundError('analyzer unavailable')
    with patch.dict(os.environ, {'NVD_API_KEY': 'fixture-value'}), patch.object(sys, 'argv', ['wrapper', 'cli', 'cache']), patch.object(module.subprocess, 'run', side_effect=fail):
        try:
            module.main()
        except FileNotFoundError:
            pass
        else:
            raise AssertionError('Launch failure was swallowed')
    assert len(files) == 1 and not files[0].exists()
`]);
});
