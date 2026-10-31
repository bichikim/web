import {expect, it} from 'vitest'
import type {SemanticBinding} from '@winter-love/wallpaper/settings/semantics'
import {semanticParameters} from '../parameters'

const parameter = {defaultValue: 0, id: 'angle', maximum: 30, minimum: -30}
const binding: SemanticBinding = {
  enabled: true,
  from: -30,
  id: 'happy',
  mode: 'toggle',
  parameterId: 'angle',
  text: '기쁨',
  threshold: 0.5,
  to: 30,
}
it('should toggle between configured values at the matching threshold', () => {
  expect(
    semanticParameters({bindings: [binding], parameters: [parameter], scores: {happy: 0.49}}),
  ).toEqual({angle: -30})
  expect(
    semanticParameters({bindings: [binding], parameters: [parameter], scores: {happy: 0.5}}),
  ).toEqual({angle: 30})
})
it('should map similarity above the threshold across a continuous negative-to-positive range', () => {
  expect(
    semanticParameters({
      bindings: [{...binding, mode: 'range'}],
      parameters: [parameter],
      scores: {happy: 0.75},
    }),
  ).toEqual({angle: 0})
  expect(
    semanticParameters({
      bindings: [{...binding, mode: 'range'}],
      parameters: [parameter],
      scores: {happy: 1},
    }),
  ).toEqual({angle: 30})
})
it('should choose the strongest match for a shared parameter and constrain its output to model bounds', () => {
  expect(
    semanticParameters({
      bindings: [binding, {...binding, id: 'sad', to: -100}],
      parameters: [parameter],
      scores: {happy: 0.6, sad: 0.9},
    }),
  ).toEqual({angle: -30})
})
it('should release overrides for disabled, missing or unanalyzed connections', () => {
  expect(
    semanticParameters({
      bindings: [{...binding, enabled: false}],
      parameters: [parameter],
      scores: {happy: 1},
    }),
  ).toEqual({})
  expect(semanticParameters({bindings: [binding], parameters: [], scores: {happy: 1}})).toEqual({})
  expect(semanticParameters({bindings: [binding], parameters: [parameter], scores: {}})).toEqual({})
})
it('should support inverted continuous output ranges', () => {
  expect(
    semanticParameters({
      bindings: [{...binding, from: 30, mode: 'range', to: -30}],
      parameters: [parameter],
      scores: {happy: 0.75},
    }),
  ).toEqual({angle: 0})
})

it('should prefer a matching connection over a higher-scoring connection below its own threshold', () => {
  expect(
    semanticParameters({
      bindings: [binding, {...binding, id: 'strict', threshold: 0.95}],
      parameters: [parameter],
      scores: {happy: 0.8, strict: 0.9},
    }),
  ).toEqual({angle: 30})
})

it.each(['toggle', 'range'] as const)(
  'should release an unmatched %s connection instead of pinning its off value over animation',
  (mode) => {
    const transient = {...binding, mode, releaseWhenUnmatched: true}
    expect(
      semanticParameters({bindings: [transient], parameters: [parameter], scores: {happy: 0.49}}),
    ).toEqual({})
    expect(
      semanticParameters({bindings: [transient], parameters: [parameter], scores: {happy: 0.75}}),
    ).toEqual({angle: mode === 'toggle' ? 30 : 0})
  },
)
