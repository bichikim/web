import {readFileSync} from 'node:fs'
import {resolve} from 'node:path'
import {expect, test} from 'vitest'
import {createBufferEngine} from '../../../buffering/create-buffer-engine'
import {createEmptyDocument} from '../../../create-empty-document'
import {PUPPET_VOWELS, type PuppetDocument} from '../../../document'
import {synthesizeVowel} from '../../../voice/__tests__/support/synthesize-vowel'
import {createWasmWorker} from '../create-worker'

const module = new WebAssembly.Module(readFileSync(resolve(import.meta.dirname, '../runtime.wasm')))
const scenarios = [
  ['a', [750, 1250]],
  ['i', [300, 2800]],
  ['e', [430, 2600]],
  ['u', [420, 1100]],
  ['o', [450, 850]],
] as const
const cases = scenarios.flatMap(([vowel, formants]) =>
  [120, 240, 300, 400].flatMap((pitch) =>
    [16000, 48000].map((rate) => ({formants, pitch, rate, vowel})),
  ),
)

test.each(cases)(
  'should preserve $vowel analysis at $pitch Hz and $rate samples/s through Rust',
  ({formants, pitch, rate}) => {
    const samples = Float32Array.from(
      synthesizeVowel(formants, {length: Math.round(rate * 0.08), pitch, rate, rms: 0.02}),
    )
    const sound = {channels: [samples], mono: samples, sampleRate: rate}
    const audio = new Map([['voice.wav', sound]])
    const document: PuppetDocument = {
      ...createEmptyDocument(),
      motions: [{duration: 1, id: 'speech', sound: {src: 'voice.wav'}, tracks: []}],
      mouthShapes: {
        parameterIds: [...PUPPET_VOWELS],
        smoothing: 0,
        vowels: {
          a: [1, 0, 0, 0, 0],
          e: [0, 0, 0, 1, 0],
          i: [0, 1, 0, 0, 0],
          o: [0, 0, 0, 0, 1],
          u: [0, 0, 1, 0, 0],
        },
      },
      parameters: PUPPET_VOWELS.map((id) => ({
        defaultValue: 0,
        id,
        maximum: 1,
        minimum: 0,
        name: id,
      })),
    }
    const reference = createBufferEngine(document)
    reference.updateAudio(audio)
    const worker = createWasmWorker(new WebAssembly.Instance(module))
    try {
      expect(worker.process({audio, document, id: 1, kind: 'initialize'}).kind).toBe('initialized')
      const state = reference.step(0, new ArrayBuffer(0)).state
      worker.process({generation: 1, id: 2, inputRevision: 0, kind: 'reset', state})
      const expected = reference.step(0.05, new ArrayBuffer(0))
      const response = worker.process({
        id: 3,
        kind: 'produce',
        request: {buffer: new ArrayBuffer(0), deltaTime: 0.05, generation: 1, time: 0.05},
      })
      if (response.kind !== 'produced' || response.frame.kind !== 'frame') {
        throw new Error('Expected frame')
      }
      for (const vowel of PUPPET_VOWELS) {
        expect(response.frame.state.frameValues[vowel]).toBeCloseTo(
          expected.state.frameValues[vowel]!,
          6,
        )
      }
    } finally {
      worker.destroy()
    }
  },
)
