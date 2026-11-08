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
