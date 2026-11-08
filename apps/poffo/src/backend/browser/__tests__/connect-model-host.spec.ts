/** @vitest-environment node */
import {afterEach, expect, test, vi} from 'vitest'
import {createEmptyDocument} from '@winter-love/puppet/player'
import {createModelBackend} from '../../create-model-backend'
import {applyModelEvent, encodeModelEvent, type ModelEvent} from '../../model-events'
import {connectModelHost} from '../connect-model-host'

afterEach(() => vi.unstubAllGlobals())

test('should retain edits arriving while the finite initial snapshot is still loading', async () => {
  const model = createModelBackend({document: createEmptyDocument(), sessionId: 'native'})
  const snapshot = encodeModelEvent(model.read(), 0)
  const {document: _document, ...metadata} = snapshot
  const before = model.read()
  model.request({
    document: {...before.document, framesPerSecond: 48},
    expectedRevision: 0,
    ownerId: 'other',
    requestId: 'edit',
    type: 'edit',
  })
  const delta = encodeModelEvent(model.read(), 1, before)
  let stream!: ReadableStreamDefaultController<Uint8Array>
  let release!: (response: Response) => void
  let requested!: () => void
  const gate = new Promise<Response>((resolve) => {
    release = resolve
  })
  const snapshotRequested = new Promise<void>((resolve) => {
    requested = resolve
  })
  vi.stubGlobal(
    'fetch',
    vi.fn<typeof fetch>(async (input, options) => {
      if (String(input).endsWith('/api/snapshot')) {
        requested()
        return gate
      }
      const body = new ReadableStream<Uint8Array>({
        start(controller) {
          stream = controller
          options?.signal?.addEventListener(
            'abort',
            () => controller.error(options.signal?.reason),
            {once: true},
          )
          controller.enqueue(new TextEncoder().encode(`${JSON.stringify(metadata)}\n`))
        },
      })
      return new Response(body)
    }),
  )
  const events: ModelEvent[] = []
  const connecting = connectModelHost({
    onDisconnect: () => {},
    onEvent: (event) => events.push(event),
    onRender: async () => {
      throw new Error('unused')
    },
    token: 'test',
    url: 'http://127.0.0.1:1234',
  })
  await snapshotRequested
  stream.enqueue(new TextEncoder().encode(`${JSON.stringify(delta)}\n`))
  release(new Response(JSON.stringify(snapshot)))
  const connection = await connecting
  try {
    expect(connection.initial.revision).toBe(0)
    expect(events.map(({sequence}) => sequence)).toEqual([0, 1])
    const final = events.reduce<ReturnType<typeof model.read> | undefined>(
      applyModelEvent,
      undefined,
    )
    expect(final).toMatchObject({document: {framesPerSecond: 48}, revision: 1})
  } finally {
    connection.close()
  }
})

test('should reattach after an idle stream abort and synchronize missed edits before sending commands', async () => {
  const model = createModelBackend({document: createEmptyDocument(), sessionId: 'native'})
  const streams: ReadableStreamDefaultController<Uint8Array>[] = []
  let resumed!: () => void
  const synchronized = new Promise<void>((resolve) => {
    resumed = resolve
  })
  const request = vi.fn<typeof fetch>(async (input, options) => {
    if (String(input).endsWith('/api/snapshot')) {
      return new Response(JSON.stringify(encodeModelEvent(model.read(), model.read().revision)))
    }
    if (String(input).endsWith('/api/command')) {
      options?.signal?.throwIfAborted()
      return new Response(
        JSON.stringify({
          ok: true,
          requestId: 'saved',
          revision: 1,
          sessionId: 'native',
          value: {savedRevision: 1},
        }),
      )
    }
    return new Response(
      new ReadableStream<Uint8Array>({
        start(controller) {
          streams.push(controller)
          options?.signal?.addEventListener(
            'abort',
            () => controller.error(options.signal?.reason),
            {once: true},
          )
        },
      }),
    )
  })
  vi.stubGlobal('fetch', request)
  const onDisconnect = vi.fn()
  const events: ModelEvent[] = []
  const connection = await connectModelHost({
    onDisconnect,
    onEvent: (event) => {
      events.push(event)
      if (event.sequence === 1) {
        resumed()
      }
    },
    onRender: async () => {
      throw new Error('unused')
    },
    token: 'test',
    url: 'http://127.0.0.1:1234',
  })
  try {
    model.request({
      document: {...model.read().document, framesPerSecond: 48},
      expectedRevision: 0,
      ownerId: 'other',
      requestId: 'edit',
      type: 'edit',
    })
    streams[0].error(new DOMException('Fetch is aborted', 'AbortError'))
    await synchronized
    const response = await connection.send('document.saved', {
      expectedRevision: 1,
      fingerprint: 'test',
    })
    expect(response.ok).toBe(true)
    expect(streams).toHaveLength(2)
    expect(
      events.reduce<ReturnType<typeof model.read> | undefined>(applyModelEvent, undefined),
    ).toMatchObject({document: {framesPerSecond: 48}, revision: 1})
    expect(onDisconnect).not.toHaveBeenCalled()
    const attachments = request.mock.calls.filter(([url]) => String(url).includes('/api/events?'))
    expect(attachments[0][0]).not.toBe(attachments[1][0])
  } finally {
    connection.close()
  }
})

test('should report a failed reattachment once and reject later commands', async () => {
  const model = createModelBackend({document: createEmptyDocument(), sessionId: 'native'})
  let stream!: ReadableStreamDefaultController<Uint8Array>
  let attached = false
  let ended!: () => void
  const disconnected = new Promise<void>((resolve) => {
    ended = resolve
  })
  const request = vi.fn<typeof fetch>(async (input) => {
    if (String(input).endsWith('/api/snapshot')) {
      return new Response(JSON.stringify(encodeModelEvent(model.read(), 0)))
    }
    if (attached) {
      throw new TypeError('Host unavailable')
    }
    attached = true
    return new Response(
      new ReadableStream<Uint8Array>({
        start(controller) {
          stream = controller
        },
      }),
    )
  })
  vi.stubGlobal('fetch', request)
  const onDisconnect = vi.fn(() => ended())
  const connection = await connectModelHost({
    onDisconnect,
    onEvent: () => {},
    onRender: async () => {
      throw new Error('unused')
    },
    token: 'test',
    url: 'http://127.0.0.1:1234',
  })
  try {
    stream.error(new DOMException('Fetch is aborted', 'AbortError'))
    await disconnected
    expect(onDisconnect).toHaveBeenCalledExactlyOnceWith('Host unavailable')
    expect(request).toHaveBeenCalledTimes(3)
    return expect(connection.send('document.saved', {})).rejects.toThrow('Host unavailable')
  } finally {
    connection.close()
  }
})

test('should treat invalid model events as a protocol failure without reconnecting', async () => {
  const model = createModelBackend({document: createEmptyDocument(), sessionId: 'native'})
  let stream!: ReadableStreamDefaultController<Uint8Array>
  let ended!: () => void
  const disconnected = new Promise<void>((resolve) => {
    ended = resolve
  })
  const request = vi.fn<typeof fetch>(async (input) =>
    String(input).endsWith('/api/snapshot')
      ? new Response(JSON.stringify(encodeModelEvent(model.read(), 0)))
      : new Response(
          new ReadableStream<Uint8Array>({
            start(controller) {
              stream = controller
            },
          }),
        ),
  )
  vi.stubGlobal('fetch', request)
  const onDisconnect = vi.fn(() => ended())
  const connection = await connectModelHost({
    onDisconnect,
    onEvent: () => {},
    onRender: async () => {
      throw new Error('unused')
    },
    token: 'test',
    url: 'http://127.0.0.1:1234',
  })
  try {
    stream.enqueue(new TextEncoder().encode('invalid\n'))
    await disconnected
    expect(onDisconnect).toHaveBeenCalledTimes(1)
    expect(request).toHaveBeenCalledTimes(2)
  } finally {
    connection.close()
  }
})
