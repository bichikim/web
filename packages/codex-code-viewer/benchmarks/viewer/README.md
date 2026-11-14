# Controlled viewer load trials

From this package directory, after building current production sources:

```sh
node --import tsx benchmarks/viewer/measure.ts /absolute/report.json [workspace] [condition ...]
```

Requires Chromium, the local Claude plugin-test CLI, and the platform's built plugin archive. No model calls are made. An existing workspace is read without modification; chat profiles and staged SDK fixtures use owned temporary directories.

Trials run sequentially, repeating each condition with reversed order in the middle round. Inputs remain constant. Session retention, the actual Pane SDK suite and a separate viewer parsing XLSX are varied independently. Retained/released session probes establish whether old sessions remain live. A successful standalone retry alone cannot establish why a historical timeout happened.

The JSON report preserves every trial, SDK assertion output, renderer metrics, preview process-family RSS/CPU snapshots and machine-wide CPU counters. RSS excludes browser processes; snapshot CPU is the operating system's lifetime-average value. Machine CPU includes unrelated background work. Load time ends when the memo rows are mounted, and input time includes Playwright input and its assertion. Deadlines prevent hanging; they are not product performance budgets.

To compare deeper retention under combined SDK and XLSX load, select `retained-heavy released-heavy` after the workspace argument. These conditions use twelve prior mounts; the regular retained/released conditions use four. Run benchmarks separately from other test jobs. Heavy trials are opt-in. The runner stops before a new mount when temporary disk space falls below 10 GiB; high retention can create substantial memory and swap pressure.
