import {expect, test} from 'vitest'

import {createDemoDocument} from '../../create-demo-document'
import {hasValidTrackTargets} from '../parse-motion'

test('should reject negative, fractional, and out-of-range vertex motion targets', () => {
  const document = createDemoDocument()
  const motion = {
    duration: 1,
    id: 'vertex-motion',
    tracks: [
      {
        axis: 'x' as const,
        keyframes: [{time: 0, value: 0}],
        kind: 'vertex' as const,
        partId: 'mesh-preview',
        vertexIndex: 0,
      },
    ],
  }

  const vertexCount =
    document.parts.find((part) => part.id === 'mesh-preview')!.mesh.vertices.length / 2
  for (const vertexIndex of [-1, 0.5, vertexCount]) {
    expect(
      hasValidTrackTargets(document.parts, document.parameters ?? [], [
        {...motion, tracks: [{...motion.tracks[0]!, vertexIndex}]},
      ]),
    ).toBe(false)
  }

  expect(hasValidTrackTargets(document.parts, document.parameters ?? [], [motion])).toBe(true)
})
