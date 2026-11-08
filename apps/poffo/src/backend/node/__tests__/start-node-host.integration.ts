import {afterEach, beforeEach, expect, test} from 'vitest'
import {mkdtemp, readFile, rm, writeFile} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {startNodeHost} from '../start-node-host'
import {sendCommand} from '../../../cli/connection'
import {stopHost} from '../../../cli/stop-host'
import {commandResponseSchema} from '../../protocol'

let directory: string
let host: Awaited<ReturnType<typeof startNodeHost>> | undefined
beforeEach(async () => {
  directory = await mkdtemp(join(tmpdir(), 'poffo-host-'))
})
afterEach(async () => {
  await host?.close(true)
  host = undefined
  await rm(directory, {force: true, recursive: true})
})

test('should share one model across authenticated clients and reject unauthenticated requests', async () => {
  host = await startNodeHost({workspace: directory})
  const unauthorized = await fetch(`${host.connection.url}/api/command`, {method: 'POST'})
  expect(unauthorized.status).toBe(401)
  const response = await sendCommand(host.connection, {
    input: {action: 'ignored'},
    operation: 'status',
    requestId: 'status',
  })
  expect(response).toMatchObject({ok: true, revision: 0, sessionId: host.connection.sessionId})
  await writeFile(
    join(directory, 'model.json'),
    JSON.stringify({...host.model.read().document, framesPerSecond: 48}),
  )
  const opened = await sendCommand(host.connection, {
    input: {expectedRevision: 0, path: 'model.json'},
    operation: 'document.open',
    requestId: 'open',
  })
  expect(opened.ok).toBe(true)
  const read = await sendCommand(host.connection, {operation: 'document.read', requestId: 'read'})
  expect(read).toMatchObject({ok: true, value: {document: {framesPerSecond: 48}, undoCount: 1}})
  const stale = await sendCommand(host.connection, {
    input: {expectedRevision: 0},
    operation: 'history.undo',
    requestId: 'stale',
  })
  expect(stale).toMatchObject({error: {code: 'stale-revision'}, ok: false})
})

test('should persist a native file that a fresh host can reload', async () => {
  host = await startNodeHost({workspace: directory})
  const result = await sendCommand(host.connection, {
    input: {expectedRevision: 0, format: 'poffo', path: 'model.poffo'},
    operation: 'document.save',
    requestId: 'save',
  })
  expect(result.ok).toBe(true)
  expect((await readFile(join(directory, 'model.poffo'))).length).toBeGreaterThan(64)
  await host.close()
  host = await startNodeHost({file: 'model.poffo', workspace: directory})
  const response = await sendCommand(host.connection, {operation: 'status', requestId: 'status'})
  expect(commandResponseSchema.parse(response).ok).toBe(true)
})

test('should release only the disconnected client transaction and roll back its provisional edit', async () => {
  host = await startNodeHost({workspace: directory})
  const {connection, model} = host
  const controller = new AbortController()
  const headers = {
    Authorization: `Bearer ${connection.token}`,
    'Content-Type': 'application/json',
    'X-Poffo-Client': 'gui',
  }
  const stream = await fetch(`${connection.url}/api/events?clientId=gui`, {
    headers,
    signal: controller.signal,
  })
  const reader = stream.body!.getReader()
  await reader.read()
  const request = async (input: unknown) =>
    fetch(`${connection.url}/api/command`, {
      body: JSON.stringify({input, operation: 'model.request', requestId: crypto.randomUUID()}),
      headers,
      method: 'POST',
    })
  await (
    await request({ownerId: 'gui-owner', requestId: 'begin', transactionId: 'drag', type: 'begin'})
  ).json()
  await (
    await request({
      document: {...model.read().document, framesPerSecond: 48},
      expectedRevision: 0,
      ownerId: 'gui-owner',
      requestId: 'edit',
      transactionId: 'drag',
      type: 'edit',
    })
  ).json()
  expect(model.read().transaction).not.toBeNull()
  const limit = AbortSignal.timeout(1000)
  let unsubscribe = () => {}
  const released = new Promise<void>((resolve, reject) => {
    limit.addEventListener(
      'abort',
      () => {
        unsubscribe()
        reject(limit.reason)
      },
      {once: true},
    )
    unsubscribe = model.subscribe((view) => {
      if (view.transaction === null) {
        unsubscribe()
        resolve()
      }
    })
  })
  controller.abort()
  await released
  await reader.cancel().catch(() => undefined)
  expect(model.read().document.framesPerSecond).not.toBe(48)
  expect(model.read().undoCount).toBe(0)
})

test('should reject foreign origins, path escapes, headless captures, and unsaved shutdown', async () => {
  host = await startNodeHost({workspace: directory})
  const {connection, model} = host
  const foreign = await fetch(`${connection.url}/api/command`, {
    headers: {Authorization: `Bearer ${connection.token}`, Origin: 'https://foreign.invalid'},
    method: 'POST',
  })
  expect(foreign.status).toBe(401)
  const escaped = await sendCommand(connection, {
    input: {expectedRevision: 0, path: join(directory, '..')},
    operation: 'document.open',
    requestId: 'escape',
  })
  expect(escaped).toMatchObject({error: {code: 'outside-workspace'}, ok: false})
  expect(
    await sendCommand(connection, {
      input: {expectedRevision: 0, path: 'render.png'},
      operation: 'view.render',
      requestId: 'headless',
    }),
  ).toMatchObject({error: {code: 'requires-gui'}, ok: false})
  model.request({
    document: {...model.read().document, framesPerSecond: 48},
    expectedRevision: 0,
    ownerId: 'test',
    requestId: 'edit',
    type: 'edit',
  })
  await expect(host.close()).rejects.toThrow('unsaved-document')
  expect(await readFile(host.connectionPath, 'utf8')).toContain(connection.sessionId)
})

test('should resolve stop only after its connection descriptor has been removed', async () => {
  host = await startNodeHost({workspace: directory})
  expect(await stopHost(host.connection, directory, false)).toEqual({ok: true})
  await expect(readFile(host.connectionPath)).rejects.toMatchObject({code: 'ENOENT'})
})

test('should allow authenticated native origins and preflight only when explicitly configured', async () => {
  host = await startNodeHost({trustedOrigins: ['tauri://localhost'], workspace: directory})
  const {connection} = host
  const preflight = await fetch(`${connection.url}/api/command`, {
    headers: {
      'Access-Control-Request-Headers': 'authorization,content-type,x-poffo-client',
      'Access-Control-Request-Method': 'POST',
      Origin: 'tauri://localhost',
    },
    method: 'OPTIONS',
  })
  expect(preflight.status).toBe(204)
  expect(preflight.headers.get('Access-Control-Allow-Origin')).toBe('tauri://localhost')
  const response = await fetch(`${connection.url}/api/command`, {
    body: JSON.stringify({operation: 'status', requestId: 'native'}),
    headers: {
      Authorization: `Bearer ${connection.token}`,
      'Content-Type': 'application/json',
      Origin: 'tauri://localhost',
    },
    method: 'POST',
  })
  expect(response.ok).toBe(true)
  expect(response.headers.get('Access-Control-Allow-Origin')).toBe('tauri://localhost')
  const missing = await fetch(`${connection.url}/api/command`, {
    headers: {Origin: 'tauri://localhost'},
    method: 'POST',
  })
  expect(missing.status).toBe(401)
  const foreign = await fetch(`${connection.url}/api/command`, {
    headers: {'Access-Control-Request-Method': 'POST', Origin: 'https://foreign.invalid'},
    method: 'OPTIONS',
  })
  expect(foreign.status).toBe(401)
  expect(foreign.headers.has('Access-Control-Allow-Origin')).toBe(false)
})

test('should provide a finite snapshot alongside metadata-first event streams', async () => {
  host = await startNodeHost({workspace: directory})
  const headers = {Authorization: `Bearer ${host.connection.token}`}
  const controller = new AbortController()
  const stream = await fetch(`${host.connection.url}/api/events?initial=metadata`, {
    headers,
    signal: controller.signal,
  })
  const reader = stream.body!.getReader()
  try {
    const initial = JSON.parse(new TextDecoder().decode((await reader.read()).value))
    expect(initial).toMatchObject({sequence: 0, view: {revision: 0}})
    expect(initial.document).toBeUndefined()
    const snapshot = await fetch(`${host.connection.url}/api/snapshot`, {headers})
    expect(await snapshot.json()).toMatchObject({document: host.model.read().document, sequence: 0})
    host.model.request({
      document: {...host.model.read().document, framesPerSecond: 48},
      expectedRevision: 0,
      ownerId: 'test',
      requestId: 'edit',
      type: 'edit',
    })
    const changed = JSON.parse(new TextDecoder().decode((await reader.read()).value))
    expect(changed).toMatchObject({sequence: 1, view: {revision: 1}})
    expect(changed.patch).toContainEqual({op: 'add', path: '/framesPerSecond', value: 48})
  } finally {
    controller.abort()
    await reader.cancel().catch(() => undefined)
  }
})
