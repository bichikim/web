import {createIsolatedOrderDocument} from '../../__tests__/fixtures/isolated-order'
import {readFileSync} from 'node:fs'
import {resolve} from 'node:path'
import {expect, test} from 'vitest'
import {createBufferEngine} from '../../../buffering/create-buffer-engine'
import type {PuppetDocument} from '../../../document'
import {parseDocumentValue} from '../../../parse-document'
import {
  constantOrderChannels,
  createOrderDocument,
  orderInputs,
} from '../../__tests__/fixtures/draw-order'
import {createWasmWorker} from '../create-worker'

const module = new WebAssembly.Module(readFileSync(resolve(import.meta.dirname, '../runtime.wasm')))

const verify = (
  document: PuppetDocument,
  samples: ReadonlyArray<{
    readonly values: Readonly<Record<string, number>>
    readonly order: ReadonlyArray<string>
  }>,
) => {
  expect(parseDocumentValue(document).ok).toBe(true)
  const reference = createBufferEngine(document)
  const worker = createWasmWorker(new WebAssembly.Instance(module))
  try {
    worker.process({audio: new Map(), document, id: 1, kind: 'initialize'})
    const initial = reference.step(0, new ArrayBuffer(reference.bytes)).state
    for (const {values, order} of samples) {
      const state = {...initial, parameterValues: values}
      reference.reset(state)
      worker.process({generation: 0, id: 2, inputRevision: 0, kind: 'reset', state})
      const response = worker.process({
        id: 3,
        kind: 'produce',
        request: {buffer: new ArrayBuffer(reference.bytes), deltaTime: 0, generation: 0, time: 0},
      })
      if (response.kind !== 'produced' || response.frame.kind !== 'frame') {
        throw new Error('Expected a Rust frame')
      }
      expect(response.frame.computed.frame.plans.map((plan) => plan.partId)).toEqual(order)
      expect(
        reference
          .step(0, new ArrayBuffer(reference.bytes))
          .computed.frame.plans.map((plan) => plan.partId),
      ).toEqual(order)
    }
  } finally {
    worker.destroy()
  }
}

test.each(constantOrderChannels)(
  'should retain equal-order overlaps in Rust and JS with triangulated %s channels',
  (channel) => {
    for (const target of ['part', 'group'] as const) {
      verify(
        createOrderDocument(channel, target),
        orderInputs.map((values) => ({order: ['plain', 'keyed'], values})),
      )
    }
  },
)

test.each(['part', 'group'] as const)(
  'should preserve authored fractional %s order transitions in Rust and JS',
  (target) =>
    verify(createOrderDocument('changing', target), [
      {order: ['keyed', 'plain'], values: {x: 0.4999, y: 0.17}},
      {order: ['plain', 'keyed'], values: {x: 0.5001, y: 0.17}},
      {order: ['keyed', 'plain'], values: {weight: 0, x: 0.5001, y: 0.17}},
    ]),
)

test('should retain scene ties, source-order ties and group membership in Rust and JS', () => {
  const source = createOrderDocument('rest', 'group')
  const document = {...source, parts: source.parts.toReversed()}
  verify(document, [{order: ['plain', 'keyed'], values: orderInputs[1]}])
  verify({...document, drawOrderTieBreak: 'parts'}, [
    {order: ['keyed', 'plain'], values: orderInputs[1]},
  ])
})

test('should keep isolated group children contiguous in Rust and JS without an extra layer', () => {
  verify(createIsolatedOrderDocument(false), [{order: ['keyed', 'plain'], values: {}}])
})

test('should key an isolated group without an explicit rest order in Rust and JS', () => {
  verify(createIsolatedOrderDocument(true), [
    {order: ['keyed', 'plain'], values: {x: 0.4999, y: 0.17}},
    {order: ['plain', 'keyed'], values: {x: 0.5001, y: 0.17}},
  ])
})
