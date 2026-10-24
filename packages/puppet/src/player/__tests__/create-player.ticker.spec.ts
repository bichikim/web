/** @vitest-environment jsdom */

import {afterEach, expect, test, vi} from 'vitest'

import {createPlayer} from '../create-player'
import {PUPPET_DOCUMENT_FORMAT, PUPPET_DOCUMENT_VERSION, type PuppetDocument} from '../document'
import {parseDocument} from '../parse-document'
import {serializeDocument} from '../serialize-document'
import {encodeWav} from '../audio/__tests__/support/encode-wav'

const mocks = vi.hoisted(() => ({
  Application: vi.fn(),
  Container: vi.fn(),
}))

vi.mock('pixi.js', () => ({
  Application: mocks.Application,
  Container: mocks.Container,
  UPDATE_PRIORITY: {LOW: -50},
}))

afterEach(() => {
  vi.clearAllMocks()
  vi.unstubAllGlobals()
})

const setUpRenderer = () => {
  const application = {
    destroy: vi.fn(),
    init: vi.fn().mockResolvedValue(undefined),
    render: vi.fn(),
    screen: {height: 10, width: 10},
    stage: {addChild: vi.fn()},
    start: vi.fn(),
    stop: vi.fn(),
    ticker: {add: vi.fn()},
  }
  const root = {addChild: vi.fn(), position: {set: vi.fn()}, scale: {set: vi.fn()}}
  for (const [mock, value] of [
    [mocks.Application, application],
    [mocks.Container, root],
  ] as const) {
    mock.mockImplementation(
      class {
        constructor() {
          Object.assign(this, value)
        }
      } as unknown as () => unknown,
    )
  }
  return {
    application,
    tick: (seconds: number) => {
      for (const [callback] of application.ticker.add.mock.calls) {
        ;(callback as (ticker: {deltaMS: number}) => void)({deltaMS: seconds * 1000})
      }
    },
  }
}

/** An audio destination whose sources record whether they were stopped. */
const createDestination = () => {
  const sources: Array<{stopped: boolean}> = []
  const context = {
    createBuffer: () => ({copyToChannel: vi.fn()}),
    createBufferSource: () => {
      const record = {stopped: false}
      sources.push(record)
      return {
        buffer: null,
        connect: vi.fn(),
        playbackRate: {value: 1},
        start: vi.fn(),
        stop: () => {
          record.stopped = true
        },
      }
    },
    createGain: () => ({connect: vi.fn(), disconnect: vi.fn(), gain: {value: 1}}),
    currentTime: 0,
  }
  return {destination: {context} as unknown as AudioNode, sources}
}

const document: PuppetDocument = {
  format: PUPPET_DOCUMENT_FORMAT,
  motions: [],
  parameters: [{defaultValue: 0, id: 'angle', maximum: 30, minimum: -30, name: 'Angle'}],
  parts: [],
  version: PUPPET_DOCUMENT_VERSION,
  viewport: {height: 10, width: 10},
}

const prepare = (value: PuppetDocument) => {
  const result = parseDocument(serializeDocument(value))
  if (!result.ok) {
    throw new Error('Expected the test document to be valid')
  }
  return result.document
}

test('should stop a motion sound as soon as playback pauses', async () => {
  const renderer = setUpRenderer()
  const wav = encodeWav({channels: [new Float32Array(16_000)], sampleRate: 8000})
  vi.stubGlobal('fetch', async () => ({arrayBuffer: async () => wav.slice().buffer, ok: true}))
  const {destination, sources} = createDestination()
  const player = await createPlayer({
    canvas: globalThis.document.createElement('canvas'),
    document: prepare({
      ...document,
      motions: [{duration: 2, id: 'talk', sound: {src: 'talk.wav'}, tracks: []}],
    }),
    soundDestination: destination,
  })
  await vi.waitFor(() => {
    renderer.tick(0.1)
    expect(sources).toHaveLength(1)
  })
  // Pausing stops the sound without another frame, since the ticker may stop with it.
  player.pause()
  expect(sources.map(({stopped}) => stopped)).toEqual([true])
  player.destroy()
})

test('should rest the ticker for effects the document has nothing to show', async () => {
  const renderer = setUpRenderer()
  const player = await createPlayer({
    canvas: globalThis.document.createElement('canvas'),
    document: prepare(document),
  })
  // No breath entries, eye-blink roles or mouth shapes: these effects move nothing.
  player.setBreath(true)
  player.setEyeBlink(true)
  player.setVowelWeights({a: 1, e: 0, i: 0, o: 0, u: 0})
  renderer.tick(0.1)
  expect(renderer.application.stop).toHaveBeenCalled()
  expect(renderer.application.start).not.toHaveBeenCalled()
  player.destroy()
})
