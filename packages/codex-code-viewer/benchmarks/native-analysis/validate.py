"""Validate sample counts, independent fixture oracles, and cross-engine positions."""

import json
import pathlib
import statistics
import sys

directory = pathlib.Path(sys.argv[1])
rows = [json.loads(line) for line in (directory / 'measurement.jsonl').read_text().splitlines()]
fixtures = {case['name']: case for case in json.loads((directory / 'fixtures.json').read_text())}
expected_records = (len(fixtures) + 4) * 3 * 3 * 2 + 2 * 2 * 3 * 2
assert len(rows) == expected_records, (len(rows), expected_records)
cases = {}
for name in dict.fromkeys(row['name'] for row in rows):
    entry = {}
    expected = set(fixtures[name]['expected']) if name in fixtures else set(next(row['positions'] for row in rows if row['name'] == name and row['variant'] == 'existing' and row['phase'] == 'cold'))
    for variant in ['existing', 'native', 'native-opened']:
        selected = [row for row in rows if row['name'] == name and row['variant'] == variant]
        result = {}
        for phase in ['cold', 'repeat']:
            samples = [row for row in selected if row['phase'] == phase]
            assert len(samples) == (5 if name in ['real-fileRevision', 'real-getWindow'] else 3)
            result[phase] = dict(runs=len(samples), counts=sorted(set(row['count'] for row in samples)), batches=sorted(set(row['batches'] for row in samples)), partialBatches=sorted(set(row['partialBatches'] for row in samples)))
            for metric in ['first', 'complete']:
                values = [row[metric] for row in samples if row[metric] is not None]
                result[phase][metric] = dict(median=statistics.median(values), minimum=min(values), maximum=max(values)) if values else None
        result['stable'] = all(set(row['positions']) == set(selected[0]['positions']) for row in selected)
        result['accuracy'] = [dict(run=row['run'], phase=row['phase'], missing=sorted(expected - set(row['positions'])), unexpected=sorted(set(row['positions']) - expected)) for row in selected]
        entry[variant] = result
    cases[name] = entry
    print(name, {variant: dict(counts=result['cold']['counts'], first=result['cold']['first'], complete=result['cold']['complete']['median'], missing=sorted(set(len(row['missing']) for row in result['accuracy'])), unexpected=sorted(set(len(row['unexpected']) for row in result['accuracy']))) for variant, result in entry.items()})
(directory / 'summary.json').write_text(json.dumps(dict(cases=cases, records=len(rows)), indent=2))
