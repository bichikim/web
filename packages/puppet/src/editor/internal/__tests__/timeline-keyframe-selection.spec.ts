import {describe, expect, test} from 'vitest'

import {createDemoDocument} from '../../../player'
import {
  easeSelectedKeyframes,
  getKeyframeMoveTarget,
  getParameterTracks,
  getSelectedKeyframe,
  updateKeyframeSelection,
} from '../timeline-keyframe-selection'

describe('timeline keyframe selection', () => {
  test('should hide physics output tracks without deleting saved animation data', () => {
    const source = createDemoDocument()
    const document = {
      ...source,
      physics: {
        pendulums: [
          {
            gravity: 9.8,
            id: 'hair',
            damping: 1.2,
            inputParameterId: 'angle-x',
            inputScale: 1,
            length: 1,
            outputParameterId: 'angle-y',
            outputScale: 1,
          },
        ],
      },
    }
    const before = JSON.stringify(document)
    expect(
      getParameterTracks(document, document.motions[0]).map((track) => track.parameter.id),
    ).toEqual(['angle-x'])
    expect(JSON.stringify(document)).toBe(before)
  })
  test('should extend, toggle, and replace selection within one parameter', () => {
    const first = updateKeyframeSelection(null, 'angle-y', 0, false)
    const extended = updateKeyframeSelection(first, 'angle-y', 1, true)

    expect(extended).toEqual({parameterId: 'angle-y', time: 1, times: [0, 1]})
    expect(updateKeyframeSelection(extended, 'angle-y', 1, true)).toEqual({
      parameterId: 'angle-y',
      time: 0,
      times: [0],
    })
    expect(updateKeyframeSelection(extended, 'angle-x', 0.5, true)).toEqual({
      parameterId: 'angle-x',
      time: 0.5,
      times: [0.5],
    })
  })

  test('should clamp group movement while preserving selected spacing', () => {
    const selection = {parameterId: 'angle-y', time: 1, times: [0, 1]}

    expect(
      getKeyframeMoveTarget({
        duration: 2,
        parameterId: 'angle-y',
        requestedTime: 3,
        selection,
        sourceTime: 1,
      }),
    ).toBe(2)
  })

  test('should exclude the final keyframe from batch easing', () => {
    const document = createDemoDocument()
    const motion = document.motions[0]!
    const selection = {parameterId: 'angle-y', time: 2, times: [1, 2]}
    const details = getSelectedKeyframe(selection, getParameterTracks(document, motion))

    expect(details?.editableTimes).toEqual([1])

    const eased = easeSelectedKeyframes({
      document,
      motion,
      selection,
      value: 'ease-in',
    })
    expect(eased?.motions[0]?.tracks[0]?.keyframes).toEqual([
      {time: 0, value: 0},
      {easing: 'ease-in', time: 1, value: -30},
      {time: 2, value: 0},
    ])
  })
})
