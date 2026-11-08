import assert from 'node:assert/strict'
import {execFile} from 'node:child_process'
import {mkdir, readFile, writeFile} from 'node:fs/promises'
import {join} from 'node:path'
import {fileURLToPath} from 'node:url'
import {promisify} from 'node:util'

const execute = promisify(execFile)
const output = process.env.POFFO_NATIVE_OUTPUT
assert.ok(output, 'Require an isolated evidence directory')
const report = {architecture: process.arch, complete: false, platform: process.platform}
await mkdir(output, {recursive: true})
try {
  assert.equal(process.platform, 'darwin', 'Require macOS')
  assert.equal(process.arch, 'x64', 'Require native Intel execution')
  report.cpuVendor = (await execute('sysctl', ['-n', 'machdep.cpu.vendor'])).stdout.trim()
  report.model = (await execute('sysctl', ['-n', 'hw.model'])).stdout.trim()
  assert.equal(report.cpuVendor, 'GenuineIntel')
  assert.doesNotMatch(report.model, /virtual/iu)
  const translated = (await execute('sysctl', ['-in', 'sysctl.proc_translated'])).stdout.trim()
  assert.notEqual(translated, '1', 'Translated execution is supplementary coverage')
  const path = join(output, 'graphics-control.json')
  const LIMIT = 120_000
  await execute('swift', [fileURLToPath(new URL('./Graphics.swift', import.meta.url)), path], {
    timeout: LIMIT,
  })
  const graphics = JSON.parse(await readFile(path, 'utf8'))
  report.graphics = graphics
  assert.equal(graphics.metal.available, true, 'Require completed Metal rasterization')
  assert.equal(graphics.metal.mac2, true, 'Require Mac GPU family 2')
  assert.doesNotMatch(graphics.metal.device, /paravirtual|virtual|swiftshader|software/iu)
  const attached = graphics.webKit.contexts.filter((context) => context.attached)
  assert.equal(attached.length, 2)
  assert.ok(attached.every((context) => context.available && context.attributes?.stencil === true))
  report.complete = true
} catch (error) {
  report.failure = error.message
  process.exitCode = 1
} finally {
  await writeFile(join(output, 'hardware.json'), JSON.stringify(report, null, 2))
  process.stdout.write(`${JSON.stringify({complete: report.complete, failure: report.failure})}\n`)
}
