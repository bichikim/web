"""Compare full input revision checks with the retained viewer and frozen preparation-optimized LSP."""

import hashlib
import json
import os
import pathlib
import signal
import subprocess
import sys
import time

package = pathlib.Path(__file__).resolve().parents[2]
repository = package.parents[1]
output = pathlib.Path(sys.argv[1]).resolve()
mode = sys.argv[2]
binary = repository / 'node_modules/.pnpm/@typescript+typescript-darwin-arm64@7.0.2/node_modules/@typescript/typescript-darwin-arm64/lib/tsc'
measure = package / 'benchmarks/native-analysis/measure.ts'
fixtures = json.loads((output / 'fixtures.json').read_text())
actual = [
    dict(name='real-fileRevision', target='packages/codex-code-viewer/src/server/file-revision.ts', needle='fileRevision =', kind='references'),
    dict(name='real-getWindow', target='packages/utils/src/browser/dom/get-window/index.ts', needle='getWindow =', kind='references'),
    dict(name='real-definition', target='apps/coong/src/components/service-worker/ServiceWorker.tsx', needle='getWindow()?.navigator', kind='definition'),
    dict(name='real-javascript', target='scripts/npm-release/code-viewer/compare-files.mjs', needle='compareFiles =', kind='references'),
]
actual = [case | dict(root=str(repository), expected=None) for case in actual]
cases = fixtures if mode == 'preflight' else actual + fixtures
for case in fixtures:
    (output / (case['name'] + '-documents.json')).write_text(json.dumps(case['documents']))

def execute(case, variant, run):
    native = variant != 'existing'
    executable = binary if native else output / 'existing/workspace.js'
    manifest = output / 'target-only.json'
    if variant == 'before':
        manifest = output / ('projects.json' if case['name'].startswith('real-') else case['name'] + '-documents.json')
    entry = output / ('before/measure.mjs' if variant == 'before' else 'after/measure.mjs')
    engine = 'native-linked' if native else 'existing'
    command = ['node', '--import', 'tsx', str(entry), engine, str(executable), case['root'], case['target'], case['needle'], case['kind'], str(manifest)]
    process = subprocess.Popen(command, cwd=package, env=os.environ | {'CODEX_HOME': str(output / f'cache-{time.time_ns()}')}, text=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, start_new_session=True)
    try:
        stdout, stderr = process.communicate(timeout=180)
    except subprocess.TimeoutExpired:
        os.killpg(process.pid, signal.SIGTERM)
        stdout, stderr = process.communicate()
        raise RuntimeError(f'Timeout: {case["name"]} {variant}')
    (output / f'{mode}-{case["name"]}-{variant}-{run}.log').write_text(stderr)
    if process.returncode != 0:
        raise RuntimeError(f'{case["name"]} {variant}: {stderr}')
    rows = [json.loads(line) | dict(name=case['name'], variant=variant, run=run) for line in stdout.splitlines()]
    assert len(rows) == 2
    for row in rows:
        if case['expected'] is not None:
            row['accuracy'] = dict(missing=sorted(set(case['expected']) - set(row['positions'])), unexpected=sorted(set(row['positions']) - set(case['expected'])))
        with (output / (mode + '.jsonl')).open('a') as destination:
            destination.write(json.dumps(row) + '\n')
        if row['phase'] == 'cold':
            print({key: row[key] for key in ['name', 'variant', 'run', 'first', 'complete', 'count']}, flush=True)

for case in cases:
    runs = 1 if mode == 'preflight' else 5 if case['name'] in ['real-fileRevision', 'real-getWindow'] else 3
    for run in range(1, runs + 1):
        variants = ['existing', 'before', 'linked']
        order = variants[(run - 1) % 3:] + variants[:(run - 1) % 3]
        for variant in order:
            execute(case, variant, run)

metadata = dict(binary=str(binary), nativeVersion=subprocess.check_output([str(binary), '--version'], text=True).strip(), node=subprocess.check_output(['node', '--version'], text=True).strip(), hashes={})
for file in [binary, output / 'existing/workspace.js', output / 'existing/navigation-worker.js', measure, package / 'benchmarks/native-analysis/create-lsp-experiment.ts']:
    metadata['hashes'][str(file)] = hashlib.sha256(file.read_bytes()).hexdigest()
(output / 'metadata.json').write_text(json.dumps(metadata, indent=2))
