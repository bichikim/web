import {describe, expect, test} from 'vitest'

import {
  PUPPET_DOCUMENT_FORMAT,
  PUPPET_DOCUMENT_VERSION,
  type PuppetDocument,
  type PuppetMotion,
  type PuppetTrack,
} from '../../document'
import {parseDocumentValue} from '../../parse-document'
import {mixGroupOpacity, mixMotionFrames} from '../mix-motion-frames'
import type {MotionFrame} from '../types'

const keys = (value: number) => [{time: 0, value}]

const createDocument = (tracks: ReadonlyArray<PuppetTrack>): PuppetDocument => ({
  format: PUPPET_DOCUMENT_FORMAT,
  motions: [{duration: 1, group: 'idle', id: 'm', tracks}],
  parameterRoles: {eyeBlink: ['eye-open', 'eye-close'], lipSync: ['mouth']},
  parameters: [
    // Cubism style: 1 is open, 0 closed.
    {defaultValue: 1, id: 'eye-open', maximum: 1, minimum: 0, name: 'Eye open'},
    // Closing style: 0 is open, 1 closed.
    {defaultValue: 0, id: 'eye-close', maximum: 1, minimum: -0.25, name: 'Eye close'},
    {defaultValue: 0, id: 'mouth', maximum: 1, minimum: 0, name: 'Mouth'},
  ],
  parts: [],
  scene: {
    roots: [{children: [], id: 'hair', kind: 'group', locked: false, name: 'Hair', visible: true}],
  },
  version: PUPPET_DOCUMENT_VERSION,
  viewport: {height: 1, width: 1},
})

const frame = (motion: PuppetMotion, weight = 1): MotionFrame => ({
  blend: 'replace',
  elapsed: 1,
  motion,
  priority: 0,
  remaining: undefined,
  time: 0,
  weight,
})

const mix = (tracks: ReadonlyArray<PuppetTrack>, options: {readonly eyeOpenness?: number} = {}) => {
  const document = createDocument(tracks)
  return mixMotionFrames({...options, document, frames: [frame(document.motions[0]!)]})
}

describe('model and group opacity tracks', () => {
  test('should set eye-blink parameters by openness, either direction', () => {
    const {parameterValues} = mix([{keyframes: keys(0.25), kind: 'model', target: 'eye-blink'}])
    expect(parameterValues['eye-open']).toBeCloseTo(0.25)
    // 0.25 open: three quarters of the way to closed (1).
    expect(parameterValues['eye-close']).toBeCloseTo(0.75)
  })

  test('should scale the motion’s own eye curve and offset its own mouth curve', () => {
    const {parameterValues} = mix([
      {keyframes: keys(0.5), kind: 'model', target: 'eye-blink'},
      {keyframes: keys(0.8), kind: 'parameter', parameterId: 'eye-open'},
      {keyframes: keys(0.3), kind: 'model', target: 'lip-sync'},
      {keyframes: keys(0.4), kind: 'parameter', parameterId: 'mouth'},
    ])
    expect(parameterValues['eye-open']).toBeCloseTo(0.4)
    expect(parameterValues.mouth).toBeCloseTo(0.7)
  })

  test('should mix model opacity and group opacity over their bases', () => {
    const result = mix([
      {keyframes: keys(0.4), kind: 'model', target: 'opacity'},
      {groupId: 'hair', keyframes: keys(0.2), kind: 'group-opacity'},
    ])
    expect(result.modelOpacity).toBeCloseTo(0.4)
    expect(mixGroupOpacity(result, 'hair', 0.9)).toBeCloseTo(0.2)
    expect(mixGroupOpacity(result, 'other', 0.9)).toBeCloseTo(0.9)
  })

  test('should let the automatic blink set eye-blink parameters', () => {
    expect(mix([], {eyeOpenness: 0}).parameterValues['eye-close']).toBe(1)
  })

  test('should validate roles, groups and track targets', () => {
    expect(parseDocumentValue(createDocument([])).ok).toBe(true)
    const document = createDocument([
      {groupId: 'missing', keyframes: keys(1), kind: 'group-opacity'},
    ])
    expect(parseDocumentValue(document).ok).toBe(false)
    const overOpaque = createDocument([{keyframes: keys(2), kind: 'model', target: 'opacity'}])
    expect(parseDocumentValue(overOpaque).ok).toBe(false)
    const unknownRole = {...createDocument([]), parameterRoles: {eyeBlink: ['nope']}}
    expect(parseDocumentValue(unknownRole).ok).toBe(false)
    const looped = {
      ...createDocument([]),
      parameterGroups: [
        {groupId: 'b', id: 'a', name: 'A'},
        {groupId: 'a', id: 'b', name: 'B'},
      ],
    }
    expect(parseDocumentValue(looped).ok).toBe(false)
    const grouped = {
      ...createDocument([]),
      parameterGroups: [{id: 'face', name: 'Face'}],
      parameters: createDocument([]).parameters!.map((parameter) => ({
        ...parameter,
        groupId: 'face',
      })),
    }
    expect(parseDocumentValue(grouped).ok).toBe(true)
  })
})
