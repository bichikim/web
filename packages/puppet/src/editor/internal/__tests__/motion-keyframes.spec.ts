import {describe, expect, test} from 'vitest'

import {createDemoDocument} from '../../../player'
import {
  deleteParameterKeyframe,
  deleteVertexKeyframe,
  insertVertexKeyframe,
  setParameterKeyframe,
  setParameterKeyframeEasing,
  setVertexKeyframe,
  setVertexKeyframeEasing,
} from '../motion-keyframes'

const createEmptyMotionDocument = () => {
  const document = createDemoDocument()
  return {
    ...document,
    motions: document.motions.map((motion) => ({...motion, tracks: []})),
  }
}

describe('insertVertexKeyframe', () => {
  test('should create both coordinate tracks from the sampled pose', () => {
    const document = createEmptyMotionDocument()

    const nextDocument = insertVertexKeyframe({
      document,
      motionId: 'idle-deform',
      partId: 'mesh-preview',
      time: 0.5,
      vertexIndex: 4,
    })

    expect(nextDocument?.motions[0]?.tracks).toEqual([
      {
        axis: 'x',
        keyframes: [{time: 0.5, value: 320}],
        partId: 'mesh-preview',
        vertexIndex: 4,
      },
      {
        axis: 'y',
        keyframes: [{time: 0.5, value: 240}],
        partId: 'mesh-preview',
        vertexIndex: 4,
      },
    ])
    expect(document.motions[0]?.tracks).toHaveLength(0)
  })

  test('should return absence for a missing target', () => {
    expect(
      insertVertexKeyframe({
        document: createEmptyMotionDocument(),
        motionId: 'missing',
        partId: 'mesh-preview',
        time: 0.5,
        vertexIndex: 4,
      }),
    ).toBeUndefined()
  })
})

describe('setVertexKeyframe', () => {
  test('should replace the pose at an existing time without changing the rest mesh', () => {
    const document = createEmptyMotionDocument()

    const nextDocument = setVertexKeyframe({
      document,
      motionId: 'idle-deform',
      partId: 'mesh-preview',
      point: {x: 300, y: 180},
      time: 1,
      vertexIndex: 4,
    })

    expect(nextDocument?.motions[0]?.tracks[0]?.keyframes[0]).toEqual({time: 1, value: 300})
    expect(nextDocument?.motions[0]?.tracks[1]?.keyframes).toEqual([{time: 1, value: 180}])
    expect(nextDocument?.parts[0]?.mesh.vertices).toBe(document.parts[0]?.mesh.vertices)
  })
})

describe('setVertexKeyframeEasing', () => {
  test('should assign easing to both coordinate tracks at the selected vertex frame', () => {
    const document = insertVertexKeyframe({
      document: createEmptyMotionDocument(),
      motionId: 'idle-deform',
      partId: 'mesh-preview',
      time: 0.5,
      vertexIndex: 4,
    })!

    const nextDocument = setVertexKeyframeEasing({
      document,
      easing: 'ease-in-out',
      motionId: 'idle-deform',
      partId: 'mesh-preview',
      time: 0.5,
      vertexIndex: 4,
    })

    expect(nextDocument?.motions[0]?.tracks[0]?.keyframes[0]).toEqual({
      easing: 'ease-in-out',
      time: 0.5,
      value: 320,
    })
    expect(nextDocument?.motions[0]?.tracks[1]?.keyframes[0]).toEqual({
      easing: 'ease-in-out',
      time: 0.5,
      value: 240,
    })
  })
})

describe('deleteVertexKeyframe', () => {
  test('should delete the selected frame from both coordinate tracks', () => {
    const document = insertVertexKeyframe({
      document: createEmptyMotionDocument(),
      motionId: 'idle-deform',
      partId: 'mesh-preview',
      time: 0.5,
      vertexIndex: 4,
    })!

    const nextDocument = deleteVertexKeyframe({
      document,
      motionId: 'idle-deform',
      partId: 'mesh-preview',
      time: 0.5,
      vertexIndex: 4,
    })

    expect(nextDocument?.motions[0]?.tracks).toEqual([])
  })
})

describe('parameter keyframes', () => {
  test('should set, clamp, ease, and delete one parameter track', () => {
    const document = createEmptyMotionDocument()
    const inserted = setParameterKeyframe({
      document,
      motionId: 'idle-deform',
      parameterId: 'angle-x',
      time: 1,
      value: 100,
    })!

    expect(inserted.motions[0]?.tracks).toEqual([
      {keyframes: [{time: 1, value: 30}], parameterId: 'angle-x'},
    ])

    const eased = setParameterKeyframeEasing({
      document: inserted,
      easing: 'ease-out',
      motionId: 'idle-deform',
      parameterId: 'angle-x',
      time: 1,
    })!
    expect(eased.motions[0]?.tracks[0]?.keyframes[0]).toEqual({
      easing: 'ease-out',
      time: 1,
      value: 30,
    })

    const deleted = deleteParameterKeyframe({
      document: eased,
      motionId: 'idle-deform',
      parameterId: 'angle-x',
      time: 1,
    })
    expect(deleted?.motions[0]?.tracks).toEqual([])
  })

  test('should return absence for an invalid parameter value or target', () => {
    const document = createEmptyMotionDocument()

    expect(
      setParameterKeyframe({
        document,
        motionId: 'idle-deform',
        parameterId: 'missing',
        time: 0,
        value: 0,
      }),
    ).toBeUndefined()
    expect(
      setParameterKeyframe({
        document,
        motionId: 'idle-deform',
        parameterId: 'angle-x',
        time: 0,
        value: Number.NaN,
      }),
    ).toBeUndefined()
  })
})
