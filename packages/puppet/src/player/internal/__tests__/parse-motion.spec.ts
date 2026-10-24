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
      hasValidTrackTargets(
        document.parts,
        document.parameters ?? [],
        [{...motion, tracks: [{...motion.tracks[0]!, vertexIndex}]}],
        new Set(),
      ),
    ).toBe(false)
  }

  expect(hasValidTrackTargets(document.parts, document.parameters ?? [], [motion], new Set())).toBe(
    true,
  )
})

test('should accept the maximum on repeat parameters but no value past the range', () => {
  const document = createDemoDocument()
  const parameters = document.parameters ?? []
  const motion = {
    duration: 1,
    id: 'turn',
    tracks: [
      {
        keyframes: [
          {time: 0, value: -30},
          {time: 1, value: 30},
        ],
        kind: 'parameter' as const,
        parameterId: 'angle-x',
      },
    ],
  }
  const repeatParameters = parameters.map((parameter) =>
    parameter.id === 'angle-x' ? {...parameter, repeat: true} : parameter,
  )

  expect(hasValidTrackTargets(document.parts, repeatParameters, [motion], new Set())).toBe(true)
  // Past the range a curve would break the document once repeat is turned off.
  const past = {
    ...motion,
    tracks: [
      {
        ...motion.tracks[0]!,
        keyframes: [
          {time: 0, value: -30},
          {time: 1, value: 75},
        ],
      },
    ],
  }
  expect(hasValidTrackTargets(document.parts, repeatParameters, [past], new Set())).toBe(false)
})
