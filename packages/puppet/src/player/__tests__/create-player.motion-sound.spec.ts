/** @vitest-environment jsdom */

import {afterEach, expect, test, vi} from 'vitest'

import {encodeWav} from '../audio/__tests__/support/encode-wav'
import {createPlayer} from '../create-player'
import {PUPPET_DOCUMENT_FORMAT, PUPPET_DOCUMENT_VERSION, type PuppetDocument} from '../document'
import {parseDocument} from '../parse-document'
import {serializeDocument} from '../serialize-document'
import {synthesizeVowel} from '../voice/__tests__/support/synthesize-vowel'

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
})

const RATE = 16_000

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
  return (seconds: number) => {
    for (const [callback] of application.ticker.add.mock.calls) {
      ;(callback as (ticker: {deltaMS: number}) => void)({deltaMS: seconds * 1000})
    }
  }
}

/** Half a second of "a", then silence, as a base64 WAV data URL. */
const talkSrc = () => {
  const vowel = synthesizeVowel([780, 1220], {length: RATE / 2, rate: RATE})
  const bytes = encodeWav({channels: [[...vowel, ...new Float64Array(RATE / 2)]], sampleRate: RATE})
  return `data:audio/wav;base64,${btoa(String.fromCodePoint(...bytes))}`
}

const createDocument = (withShapes: boolean, src: string): PuppetDocument => ({
  format: PUPPET_DOCUMENT_FORMAT,
  motions: [{duration: 2, id: 'talk', sound: {src}, tracks: []}],
  ...(withShapes
    ? {
        mouthShapes: {
          parameterIds: ['mouth'],
          smoothing: 0,
          vowels: {a: [1], e: [0.5], i: [0.3], o: [0.7], u: [0.2]},
        },
      }
    : {parameterRoles: {lipSync: ['mouth']}}),
  parameters: [{defaultValue: 0, id: 'mouth', maximum: 1, minimum: 0, name: 'Mouth'}],
  parts: [],
  version: PUPPET_DOCUMENT_VERSION,
  viewport: {height: 10, width: 10},
})

const prepare = (document: PuppetDocument) => {
  const result = parseDocument(serializeDocument(document))
  if (!result.ok) {
    throw new Error('Expected the test document to be valid')
  }
  return result.document
}

test.each([true, false])(
  'should open the mouth from the playing motion sound (mouth shapes: %s)',
  async (withShapes) => {
    const tick = setUpRenderer()
    const player = await createPlayer({
      canvas: globalThis.document.createElement('canvas'),
      document: prepare(createDocument(withShapes, talkSrc())),
    })
    await vi.waitFor(() => {
      tick(0.1)
      expect(player.getParameterValue('mouth')).toBeGreaterThan(0.9)
    })
    // Past the voiced half second the one-second sound is silent; while it lasts, it takes
    // over from the app's lip sync.
    player.seek(0.75)
    player.setLipSync(0.5)
    player.setVowelWeights({o: 1})
    tick(0)
    expect(player.getParameterValue('mouth')).toBe(0)
    // Once the sound has ended, the app's lip sync applies again.
    player.seek(1.5)
    tick(0)
    expect(player.getParameterValue('mouth')).toBe(withShapes ? 0.7 : 0.5)
    player.destroy()
  },
)

test('should report sounds it cannot decode and keep playing', async () => {
  setUpRenderer()
  const onSoundError = vi.fn()
  await createPlayer({
    canvas: globalThis.document.createElement('canvas'),
    document: prepare(createDocument(true, 'data:audio/wav;base64,AAAA')),
    onSoundError,
  })
  await vi.waitFor(() =>
    expect(onSoundError).toHaveBeenCalledWith({
      reason: 'not-wav',
      src: 'data:audio/wav;base64,AAAA',
    }),
  )
})
