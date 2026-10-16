import {describe, expect, test} from 'vitest'

import {PUPPET_DOCUMENT_FORMAT, PUPPET_DOCUMENT_VERSION, type PuppetDocument} from '../document'
import {
  advanceLookPoint,
  applyLook,
  clampLookTarget,
  isLookSettled,
  LOOK_MAXIMUM_SPEED,
  LOOK_REST,
  type LookPoint,
} from '../look'
import {parseDocumentValue} from '../parse-document'

const document: PuppetDocument = {
  format: PUPPET_DOCUMENT_FORMAT,
  look: [
    {parameterId: 'face-x', x: 30, xy: 0, y: 0},
    {parameterId: 'face-z', x: 0, xy: -30, y: 0},
    {parameterId: 'gaze-y', x: 0, xy: 0, y: 1},
  ],
  motions: [],
  parameters: ['face-x', 'face-z']
    .map((id) => ({
      defaultValue: 0,
      id,
      maximum: 30,
      minimum: -30,
      name: id,
    }))
    .concat([{defaultValue: 0, id: 'gaze-y', maximum: 1, minimum: -1, name: 'gaze-y'}]),
  parts: [],
  version: PUPPET_DOCUMENT_VERSION,
  viewport: {height: 1, width: 1},
}

const run = (point: LookPoint, target: {x: number; y: number}, frames: number) => {
  const path = [point]
  for (let frame = 0; frame < frames; frame += 1) {
    path.push(advanceLookPoint(path.at(-1)!, target, 1 / 60))
  }
  return path
}

describe('look', () => {
  test('should follow the target with limited speed and stop on it', () => {
    const path = run(LOOK_REST, {x: 1, y: 0}, 40)
    const steps = path.slice(1).map((point, index) => point.x - path[index]!.x)
    // Speeds up, never passes the maximum speed or the target, then rests exactly on it.
    expect(steps[1]!).toBeGreaterThan(steps[0]!)
    expect(Math.max(...steps)).toBeLessThanOrEqual(LOOK_MAXIMUM_SPEED / 60 + 1e-12)
    expect(Math.max(...path.map((point) => point.x))).toBeLessThanOrEqual(1)
    expect(isLookSettled(path.at(-1)!, {x: 1, y: 0})).toBe(true)
    // Not moving without time; a cleared target is the center; targets stay within -1..1.
    expect(advanceLookPoint(path[3]!, {x: 1, y: 0}, 0)).toBe(path[3])
    expect(clampLookTarget(undefined)).toEqual({x: 0, y: 0})
    expect(clampLookTarget({x: 3, y: Number.NaN})).toEqual({x: 1, y: 0})
  })

  test('should add each factor of the look point within the parameter range', () => {
    expect(parseDocumentValue(document).ok).toBe(true)
    expect(applyLook(document, {'face-x': 5}, {x: 0.5, y: -1})).toEqual({
      'face-x': 20,
      'face-z': 15,
      'gaze-y': -1,
    })
    // 30 + 30 passes the maximum.
    expect(applyLook(document, {'face-x': 30}, {x: 1, y: 0})['face-x']).toBe(30)
    const invalid = (entry: Record<string, unknown>) =>
      parseDocumentValue({...document, look: [{...document.look![0], ...entry}]}).ok
    expect(invalid({xy: Number.POSITIVE_INFINITY})).toBe(false)
    expect(invalid({parameterId: 'missing'})).toBe(false)
  })
})
