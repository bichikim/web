import {expect, test} from 'vitest'
import {createDemoDocument} from '../../player'
import {commitVertexMove} from '../commit-vertex-move'

test('should store vertex edits in the selected motion and preserve other motions', () => {
  const document = createDemoDocument()
  const result = commitVertexMove({
    document,
    editMode: 'motion',
    keyframeTime: 0.2,
    motionId: 'blink',
    parameterValues: null,
    part: document.parts[0]!,
    vertexIndex: 4,
    x: 330,
    y: 240,
  })
  expect(result.ok).toBe(true)
  if (!result.ok) {
    throw new Error(result.message)
  }
  expect(result.document.parts).toBe(document.parts)
  expect(result.document.motions[0]).toBe(document.motions[0])
  expect(result.document.motions[2]).toBe(document.motions[2])
  expect(result.document.motions[1]?.tracks).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        keyframes: expect.arrayContaining([expect.objectContaining({time: 0.2})]),
        kind: 'vertex',
        partId: 'mesh-preview',
      }),
    ]),
  )
})
