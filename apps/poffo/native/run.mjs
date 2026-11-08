import assert from 'node:assert/strict'
import {execFile, spawn} from 'node:child_process'
import {createHash, randomUUID} from 'node:crypto'
import {on, once} from 'node:events'
import {watch} from 'node:fs'
import {createServer} from 'node:http'
import {constants} from 'node:http2'
import {copyFile, mkdir, readdir, readFile, writeFile} from 'node:fs/promises'
import {dirname, join} from 'node:path'
import {createInterface} from 'node:readline'
import {fileURLToPath} from 'node:url'
import {promisify} from 'node:util'
import {traceNativeSave} from './macos/trace-host.mjs'

const execute = promisify(execFile)
const directory = dirname(fileURLToPath(import.meta.url))
const application = process.env.POFFO_NATIVE_APP
const executable = process.env.POFFO_INSTALLED_CLI
const workspace = process.env.POFFO_NATIVE_WORKSPACE
const output = process.env.POFFO_NATIVE_OUTPUT
assert.ok(
  application && executable && workspace && output,
  'Require installed app and isolated paths',
)
const attached = `${workspace} attached`
const savedPath = join(workspace, '캐릭터 저장.poffo')
const hash = (value) => createHash('sha256').update(value).digest('hex')
const documentHash = (value) => hash(JSON.stringify(value))
const REQUEST_LIMIT = 30_000
const DRIVER_LIMIT = 600_000
const PART_COUNT = 122
const ORIGINAL_MOTIONS = 6
const EDITED_MOTIONS = 7
const ERROR_LENGTH = 2000
const TRACE_CHECKPOINTS = 6
const source = join(directory, '../../../packages/puppet/examples/development-model.json')
const sourceBytes = await readFile(source)
await mkdir(workspace, {recursive: true})
await mkdir(attached, {recursive: true})
await mkdir(output, {recursive: true})
await copyFile(source, join(workspace, 'source.json'))

const report = {
  architecture: process.arch,
  complete: false,
  framework: process.platform === 'darwin' ? 'XCTest/XCUIAutomation' : 'Windows UI Automation',
  installer: JSON.parse(await readFile(join(output, '../installer.json'), 'utf8')),
  platform: process.platform,
  requireNativeGpu: process.env.POFFO_NATIVE_REQUIRE_GPU === 'true',
  sourceHash: hash(sourceBytes),
  steps: [],
}
let initial
let opened
let edited
let recovery
let savedHash
let attachedHost
let attachedState
let appSession
let nativeTrace
const connection = async (root = workspace) =>
  JSON.parse(await readFile(join(root, '.poffo/connection.json'), 'utf8'))

const call = async (operation, input = {}, root = workspace) => {
  const host = await connection(root)
  const response = await fetch(`${host.url}/api/command`, {
    body: JSON.stringify({input, operation, requestId: randomUUID()}),
    headers: {Authorization: `Bearer ${host.token}`, 'Content-Type': 'application/json'},
    method: 'POST',
    signal: AbortSignal.timeout(REQUEST_LIMIT),
  })
  assert.equal(response.ok, true, `Backend HTTP ${response.status}`)
  const result = await response.json()
  assert.equal(result.ok, true, result.error?.message)
  return result
}

const readModel = async (root = workspace) => {
  const result = await call('document.read', {}, root)
  return {document: result.value.document, revision: result.revision, sessionId: result.sessionId}
}

const applyPatch = async (patch, title) => {
  const status = await call('status')
  const input = {expectedRevision: status.revision, patch}
  const preview = await call('edit.preview', input)
  await call('edit.apply', {...input, fingerprint: preview.value.fingerprint, title})
  return readModel()
}

const assertStopped = async (root = workspace) => {
  await assert.rejects(readFile(join(root, '.poffo/connection.json')), {code: 'ENOENT'})
  return {ownedHostStopped: true}
}

const readNativeSave = async () => {
  const watcher = watch(workspace)
  const changes = on(watcher, 'change', {signal: AbortSignal.timeout(REQUEST_LIMIT)})
  try {
    while (true) {
      try {
        // Native file creation is independent of the accessibility provider's refresh.
        // eslint-disable-next-line no-await-in-loop
        const bytes = await readFile(savedPath)
        if (bytes.length > 0) {
          return bytes
        }
      } catch (error) {
        if (error.code !== 'ENOENT') {
          throw error
        }
      }
      // eslint-disable-next-line no-await-in-loop
      await changes.next()
    }
  } finally {
    await changes.return()
    watcher.close()
  }
}

const assertSnapshot = async (expected, root = workspace) => {
  const actual = await readModel(root)
  assert.deepEqual(actual, expected)
  return {documentHash: documentHash(actual.document), revision: actual.revision, sameSession: true}
}

const assertReopened = async (expected) => {
  const actual = await readModel()
  assert.notEqual(actual.sessionId, appSession)
  assert.deepEqual(actual.document, expected.document)
  appSession = actual.sessionId
  return {
    documentHash: documentHash(actual.document),
    motions: actual.document.motions.length,
    newSession: true,
    parts: actual.document.parts.length,
    wholeDocumentEqual: true,
  }
}

const startAttachedHost = async () => {
  await copyFile(savedPath, join(attached, 'saved.poffo'))
  attachedHost = spawn(
    executable,
    ['start', '--cli', '--workspace', attached, '--file', 'saved.poffo'],
    {
      stdio: ['pipe', 'pipe', 'pipe'],
    },
  )
  const lines = createInterface({input: attachedHost.stdout})
  try {
    const signal = AbortSignal.timeout(REQUEST_LIMIT)
    await new Promise((resolve, reject) => {
      const finish = (error) => {
        lines.off('line', ready)
        attachedHost.off('exit', failed)
        attachedHost.off('error', failed)
        signal.removeEventListener('abort', aborted)
        if (error === undefined) {
          resolve()
        } else {
          reject(error)
        }
      }
      const ready = (line) => {
        try {
          if (JSON.parse(line).ready === true) {
            finish()
          }
        } catch {
          /* Other launch output is not a connection descriptor. */
        }
      }
      const failed = (code) => finish(new Error(`Independent host exited: ${code}`))
      const aborted = () => finish(signal.reason)
      lines.on('line', ready)
      attachedHost.once('exit', failed)
      attachedHost.once('error', failed)
      signal.addEventListener('abort', aborted, {once: true})
    })
    attachedHost.stderr.resume()
    attachedState = await readModel(attached)
    assert.deepEqual(attachedState.document, edited.document)
  } finally {
    lines.close()
  }
  return {independentHostReady: true}
}

const checkpoints = new Map([
  [
    'launched',
    async () => {
      initial = await readModel()
      appSession = initial.sessionId
      assert.equal(initial.document.parts.length, 0)
      return {parts: 0}
    },
  ],
  ['open-cancelled', () => assertSnapshot(initial)],
  [
    'opened',
    async () => {
      opened = await readModel()
      assert.equal(opened.document.parts.length, PART_COUNT)
      assert.equal(opened.document.motions.length, ORIGINAL_MOTIONS)
      return {motions: 6, parts: 122}
    },
  ],
  [
    'edited',
    async () => {
      const recipe = JSON.parse(
        await readFile(join(directory, '../validation/character/recipe.json'), 'utf8'),
      )
      edited = await applyPatch(recipe.steps[0].patch, 'CLI 검증 모션 추가')
      const {motions: _previousMotions, ...originalRig} = opened.document
      const {motions, ...currentRig} = edited.document
      assert.deepEqual(currentRig, originalRig)
      assert.deepEqual(motions.slice(0, ORIGINAL_MOTIONS), opened.document.motions)
      assert.equal(motions.length, EDITED_MOTIONS)
      let nativeFrame
      try {
        const frame = await call('view.render', {
          expectedRevision: edited.revision,
          path: 'native-frame.png',
          size: 640,
        })
        const pixels = await readFile(join(workspace, 'native-frame.png'))
        await copyFile(join(workspace, 'native-frame.png'), join(output, 'native-frame.png'))
        nativeFrame = {available: true, hash: hash(pixels), ...frame.value}
      } catch (error) {
        assert.equal(process.platform, 'darwin', error.message)
        const probe = JSON.parse(await readFile(join(output, 'graphics.json'), 'utf8'))
        assert.equal(probe.pixiProbe.available, false, error.message)
        assert.match(error.message, /No available renderer for the current environment/u)
        nativeFrame = {available: false, independentWebKitProbe: probe, reason: error.message}
      }
      assert.ok(
        nativeFrame.available || !report.requireNativeGpu,
        'Native character GPU rendering is required for this validation',
      )
      await nativeTrace?.waitForStreamClose()
      return {
        motions: 7,
        nativeFrame,
        parts: 122,
        rigPreserved: true,
      }
    },
  ],
  [
    'save-cancelled',
    async () => {
      await assert.rejects(readFile(savedPath), {code: 'ENOENT'})
      return {noFileCreated: true, ...(await assertSnapshot(edited))}
    },
  ],
  ['close-cancelled', () => assertSnapshot(edited)],
  [
    'saved',
    async () => {
      savedHash = hash(await readNativeSave())
      await assertSnapshot(edited)
      if (report.traceOnly) {
        try {
          await call('view.render', {
            expectedRevision: edited.revision,
            path: 'trace-frame.png',
            size: 640,
          })
          report.rendererAfterSave = {available: true}
        } catch (error) {
          report.rendererAfterSave = {error: error.message}
        }
      }
      return {fileHash: savedHash, path: savedPath}
    },
  ],
  ['clean-closed', () => assertStopped()],
  ['reopened', () => assertReopened(edited)],
  ['reopened-closed', () => assertStopped()],
  [
    'edited-again',
    async () => {
      const current = await readModel()
      appSession = current.sessionId
      recovery = await applyPatch(
        [
          {
            op: 'replace',
            path: `/motions/${current.document.motions.length - 1}/duration`,
            value: 5,
          },
        ],
        '네이티브 종료 복구 검증',
      )
      return {revision: recovery.revision}
    },
  ],
  ['discarded', () => assertStopped()],
  [
    'recovered',
    async () => {
      assert.equal(hash(await readFile(savedPath)), savedHash)
      return assertReopened(recovery)
    },
  ],
  ['recovered-closed', () => assertStopped()],
  ['attached-start', startAttachedHost],
  ['attached-closed', () => assertSnapshot(attachedState, attached)],
])

const persistReport = () => writeFile(join(output, 'report.json'), JSON.stringify(report, null, 2))
const server = createServer((request, response) => {
  const handle = async () => {
    assert.equal(request.method, 'POST')
    assert.equal(request.url, '/checkpoint')
    const chunks = []
    for await (const chunk of request) {
      chunks.push(chunk)
    }
    const {name} = JSON.parse(Buffer.concat(chunks).toString('utf8'))
    const expected = [...checkpoints.keys()][report.steps.length]
    assert.equal(name, expected, 'Native checkpoints must execute in order')
    const detail = await checkpoints.get(name)()
    report.steps.push({detail, name, passed: true})
    await persistReport()
    process.stdout.write(`Native checkpoint: ${name}\n`)
    response.writeHead(constants.HTTP_STATUS_OK, {'Content-Type': 'application/json'})
    response.end(JSON.stringify({ok: true}))
  }
  handle().catch(async (error) => {
    report.failure = {message: error.message, stage: [...checkpoints.keys()][report.steps.length]}
    await persistReport()
    response.writeHead(constants.HTTP_STATUS_INTERNAL_SERVER_ERROR, {
      'Content-Type': 'application/json',
    })
    response.end(JSON.stringify({error: error.message}))
  })
})

const run = async (command, arguments_, environment = process.env) => {
  const child = spawn(command, arguments_, {
    env: environment,
    signal: AbortSignal.timeout(DRIVER_LIMIT),
    stdio: 'inherit',
  })
  const [code] = await once(child, 'exit')
  assert.equal(code, 0, `${command} failed`)
}

const runMac = async (environment) => {
  const derived = join(dirname(workspace), 'poffo-native-derived')
  await run('xcodebuild', [
    'build-for-testing',
    '-project',
    join(directory, 'macos/Native.xcodeproj'),
    '-scheme',
    'Native',
    '-destination',
    'platform=macOS',
    '-derivedDataPath',
    derived,
    'CODE_SIGNING_ALLOWED=NO',
  ])
  const products = join(derived, 'Build/Products')
  const file = join(
    products,
    (await readdir(products)).find((name) => name.endsWith('.xctestrun')),
  )
  const encoded = await execute('plutil', ['-convert', 'json', '-o', '-', file])
  const settings = JSON.parse(encoded.stdout)
  for (const name of [
    'POFFO_NATIVE_APP',
    'POFFO_NATIVE_WORKSPACE',
    'POFFO_NATIVE_OUTPUT',
    'POFFO_NATIVE_CONTROL',
    'POFFO_NATIVE_TRACE',
  ]) {
    settings.NativeUITests.EnvironmentVariables[name] = environment[name]
  }
  await writeFile(file, JSON.stringify(settings))
  await execute('plutil', ['-convert', 'xml1', file])
  await run(
    'xcodebuild',
    [
      'test-without-building',
      '-xctestrun',
      file,
      '-destination',
      'platform=macOS',
      '-resultBundlePath',
      join(output, 'results.xcresult'),
    ],
    environment,
  )
}

const stopWorkspace = async (root) => {
  try {
    await connection(root)
    await execute(executable, ['stop', '--discard', '--workspace', root], {timeout: REQUEST_LIMIT})
  } catch (error) {
    if (error.code !== 'ENOENT') {
      report.cleanup ??= []
      report.cleanup.push({message: error.message.slice(0, ERROR_LENGTH), workspace: root})
    }
  }
}

try {
  if (process.env.POFFO_NATIVE_TRACE === 'true') {
    assert.equal(process.platform, 'darwin')
    nativeTrace = await traceNativeSave({executable, output, workspace})
    report.traceOnly = true
    checkpoints.delete('close-cancelled')
  }
  server.listen(0, '127.0.0.1')
  await once(server, 'listening')
  const environment = {
    ...process.env,
    POFFO_NATIVE_CONTROL: `http://127.0.0.1:${server.address().port}`,
  }
  await persistReport()
  if (process.platform === 'darwin') {
    await runMac(environment)
  } else {
    assert.equal(process.platform, 'win32')
    await run(
      'powershell.exe',
      [
        '-Mta',
        '-NoProfile',
        '-ExecutionPolicy',
        'Bypass',
        '-File',
        join(directory, 'windows/run.ps1'),
      ],
      environment,
    )
  }
  assert.equal(report.steps.length, report.traceOnly ? TRACE_CHECKPOINTS : checkpoints.size)
  assert.equal(hash(await readFile(join(workspace, 'source.json'))), report.sourceHash)
  if (report.traceOnly) {
    report.traceComplete = true
  } else {
    report.complete = true
  }
} catch (error) {
  report.failure ??= {message: error.message, stage: [...checkpoints.keys()][report.steps.length]}
  process.exitCode = 1
  process.stderr.write(`${error.stack}\n`)
} finally {
  if (!report.complete) {
    report.workspaceFiles = await readdir(workspace)
    try {
      const current = await readModel()
      report.lastState = {
        documentHash: documentHash(current.document),
        motions: current.document.motions.length,
        parts: current.document.parts.length,
        revision: current.revision,
      }
    } catch (error) {
      report.lastState = {message: error.message.slice(0, ERROR_LENGTH)}
    }
  }
  await nativeTrace?.restore()
  await Promise.all([workspace, attached].map(stopWorkspace))
  await nativeTrace?.close()
  attachedHost?.stdin.end()
  if (
    attachedHost !== undefined &&
    attachedHost.exitCode === null &&
    attachedHost.signalCode === null
  ) {
    await once(attachedHost, 'exit', {signal: AbortSignal.timeout(REQUEST_LIMIT)}).catch(() =>
      attachedHost.kill(),
    )
  }
  await persistReport()
  server.closeAllConnections()
  server.close()
}
