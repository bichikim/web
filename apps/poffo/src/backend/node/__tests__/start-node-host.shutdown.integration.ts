import {expect, test} from 'vitest'
import {connect} from 'node:net'
import {once} from 'node:events'
import {copyFile, mkdtemp, rm} from 'node:fs/promises'
import {fileURLToPath} from 'node:url'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {startNodeHost} from '../start-node-host'
import {sendCommand} from '../../../cli/connection'

test('should reject a clean shutdown when an already accepted edit makes the document dirty', async () => {
  const workspace = await mkdtemp(join(tmpdir(), 'poffo-shutdown-'))
  const host = await startNodeHost({workspace})
  try {
    const edited = host.service.execute({
      input: {
        document: {...host.model.read().document, framesPerSecond: 48},
        expectedRevision: 0,
        ownerId: 'test',
        requestId: 'edit',
        type: 'edit',
      },
      operation: 'model.request',
      requestId: 'edit',
    })
    await expect(host.close()).rejects.toThrow('unsaved-document')
    expect((await edited).ok).toBe(true)
    expect(host.model.read().document.framesPerSecond).toBe(48)
    expect(host.server.listening).toBe(true)
  } finally {
    await host.close(true)
    await rm(workspace, {force: true, recursive: true})
  }
})

test('should stop without waiting for an incomplete client request body', async () => {
  const workspace = await mkdtemp(join(tmpdir(), 'poffo-shutdown-'))
  const host = await startNodeHost({workspace})
  const url = new URL(host.connection.url)
  const socket = connect({host: url.hostname, port: Number(url.port)})
  let closing: Promise<void> | undefined
  try {
    await once(socket, 'connect')
    const accepted = once(host.server, 'request')
    socket.write(
      [
        'POST /api/command HTTP/1.1',
        `Host: ${url.host}`,
        `Authorization: Bearer ${host.connection.token}`,
        'Content-Type: application/json',
        'Content-Length: 1000',
        '',
        '{',
      ].join('\r\n'),
    )
    await accepted
    const LIMIT = 200
    const stopped = once(host.server, 'close', {signal: AbortSignal.timeout(LIMIT)})
    closing = host.close(true)
    await stopped
    await closing
    expect(host.server.listening).toBe(false)
  } finally {
    socket.destroy()
    await (closing ?? host.close(true))
    await rm(workspace, {force: true, recursive: true})
  }
})

test('should stop while a client leaves a large model snapshot unread', async () => {
  const workspace = await mkdtemp(join(tmpdir(), 'poffo-shutdown-'))
  await copyFile(
    fileURLToPath(
      new URL('../../../../../../packages/puppet/examples/development-model.json', import.meta.url),
    ),
    join(workspace, 'source.json'),
  )
  const host = await startNodeHost({file: 'source.json', workspace})
  const url = new URL(host.connection.url)
  const socket = connect({host: url.hostname, port: Number(url.port)})
  let closing: Promise<void> | undefined
  try {
    await once(socket, 'connect')
    const readable = once(socket, 'readable')
    socket.write(
      [
        'GET /api/snapshot HTTP/1.1',
        `Host: ${url.host}`,
        `Authorization: Bearer ${host.connection.token}`,
        '',
        '',
      ].join('\r\n'),
    )
    await readable
    const LIMIT = 200
    const stopped = once(host.server, 'close', {signal: AbortSignal.timeout(LIMIT)})
    closing = host.close(true)
    await stopped
    await closing
    expect(host.server.listening).toBe(false)
  } finally {
    socket.destroy()
    await (closing ?? host.close(true))
    await rm(workspace, {force: true, recursive: true})
  }
})

test('should cancel an attached pending render before waiting for command completion', async () => {
  const workspace = await mkdtemp(join(tmpdir(), 'poffo-shutdown-'))
  const host = await startNodeHost({workspace})
  const abort = new AbortController()
  const response = await fetch(`${host.connection.url}/api/events?clientId=renderer`, {
    headers: {Authorization: `Bearer ${host.connection.token}`},
    signal: abort.signal,
  })
  const reader = response.body!.getReader()
  let closing: Promise<void> | undefined
  try {
    await reader.read()
    const rendered = sendCommand(host.connection, {
      input: {expectedRevision: 0, path: 'frame.png', size: 64},
      operation: 'view.render',
      requestId: 'render',
    })
    await reader.read()
    const LIMIT = 200
    const stopped = once(host.server, 'close', {signal: AbortSignal.timeout(LIMIT)})
    closing = host.close(true)
    await stopped
    await closing
    expect(await rendered).toMatchObject({error: {code: 'host-closing'}, ok: false})
  } finally {
    abort.abort()
    await reader.cancel().catch(() => undefined)
    await (closing ?? host.close(true))
    await rm(workspace, {force: true, recursive: true})
  }
})
