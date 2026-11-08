import assert from 'node:assert/strict'
import {glob, readFile, writeFile} from 'node:fs/promises'
import {join} from 'node:path'

const [directory, mode = 'character'] = process.argv.slice(2)
const TARGET_COUNT = 3
const POSE_COUNT = 6
assert.ok(directory, 'Provide the downloaded evidence directory')
const diagnostic = mode === 'diagnostic'
const pattern = diagnostic ? '**/pixels/report.json' : '**/chromium/report.json'
const paths = await Array.fromAsync(glob(pattern, {cwd: directory}))
const reports = await Promise.all(
  paths.map(async (path) => JSON.parse(await readFile(join(directory, path), 'utf8'))),
)
assert.equal(reports.length, TARGET_COUNT, 'Require evidence from all three target platforms')
const identity = (report) =>
  diagnostic ? `${report.platform}-${report.architecture}` : report.doctor.manifest.target
assert.equal(new Set(reports.map(identity)).size, TARGET_COUNT, 'Require three distinct platforms')
const [reference, ...others] = reports.toSorted((first, second) =>
  identity(first).localeCompare(identity(second)),
)
const firstDifference = (left, right) => {
  const index = left.findIndex(
    (value, offset) => JSON.stringify(value) !== JSON.stringify(right[offset]),
  )
  return index === -1 && left.length !== right.length ? Math.min(left.length, right.length) : index
}
const comparisons = others.map((report) => {
  if (!diagnostic) {
    assert.equal(Object.keys(report.images).length, POSE_COUNT)
    return {
      matches: Object.entries(reference.images).every(
        ([name, hash]) => report.images[name] === hash,
      ),
      platform: identity(report),
    }
  }
  for (const source of [reference, report]) {
    assert.match(source.drawingBufferHash, /^[a-f\d]{64}$/u)
    assert.match(source.pngPixelHash, /^[a-f\d]{64}$/u)
  }
  return {
    drawingBufferMatches: report.drawingBufferHash === reference.drawingBufferHash,
    platform: identity(report),
    encodingControlMatches: report.control.pngPixelHash === reference.control.pngPixelHash,
    pngMatches: report.pngPixelHash === reference.pngPixelHash,
    firstCommandDifference: firstDifference(reference.commands, report.commands),
    firstStageDifference:
      reference.stages.length === 0 || report.stages.length === 0
        ? null
        : firstDifference(reference.stages, report.stages),
    matches:
      report.drawingBufferHash === reference.drawingBufferHash &&
      report.pngPixelHash === reference.pngPixelHash,
  }
})
if (!diagnostic) {
  assert.equal(Object.keys(reference.images).length, POSE_COUNT)
}
const summary = {comparisons, mode, reference: identity(reference)}
await writeFile(join(directory, 'summary.json'), JSON.stringify(summary, null, 2))
console.log(JSON.stringify(summary, null, 2))
assert.ok(
  comparisons.every((comparison) => comparison.matches),
  'Cross-platform pixels must match exactly',
)
