import {describe, expect, test} from 'vitest'

import {createDemoDocument} from '../../../player'
import {
  deleteVertexKeyframe,
  insertVertexKeyframe,
  setVertexKeyframe,
  setVertexKeyframeEasing,
} from '../motion-keyframes'

describe('insertVertexKeyframe', () => {
  test('should create both coordinate tracks from the sampled pose', () => {
    const document = createDemoDocument()

    const nextDocument = insertVertexKeyframe({
      document,
      motionId: 'idle-deform',
      partId: 'mesh-preview',
      time: 0.5,
      vertexIndex: 4,
    })

    expect(nextDocument?.motions[0]?.tracks).toEqual([
      {
        axis: 'y',
        keyframes: [
          {time: 0, value: 240},
          {time: 0.5, value: 208},
          {time: 1, value: 176},
          {time: 2, value: 240},
        ],
        partId: 'mesh-preview',
        vertexIndex: 4,
      },
      {
        axis: 'x',
        keyframes: [{time: 0.5, value: 320}],
        partId: 'mesh-preview',
        vertexIndex: 4,
      },
    ])
    expect(document.motions[0]?.tracks).toHaveLength(1)
  })

  test('should return absence for a missing target', () => {
    expect(
      insertVertexKeyframe({
        document: createDemoDocument(),
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
    const document = createDemoDocument()

    const nextDocument = setVertexKeyframe({
      document,
      motionId: 'idle-deform',
      partId: 'mesh-preview',
      point: {x: 300, y: 180},
      time: 1,
      vertexIndex: 4,
    })

    expect(nextDocument?.motions[0]?.tracks[0]?.keyframes[1]).toEqual({time: 1, value: 180})
    expect(nextDocument?.motions[0]?.tracks[1]?.keyframes).toEqual([{time: 1, value: 300}])
    expect(nextDocument?.parts[0]?.mesh.vertices).toBe(document.parts[0]?.mesh.vertices)
  })
})

describe('setVertexKeyframeEasing', () => {
  test('should assign easing to both coordinate tracks at the selected vertex frame', () => {
    const document = insertVertexKeyframe({
      document: createDemoDocument(),
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

    expect(nextDocument?.motions[0]?.tracks[0]?.keyframes[1]).toEqual({
      easing: 'ease-in-out',
      time: 0.5,
      value: 208,
    })
    expect(nextDocument?.motions[0]?.tracks[1]?.keyframes[0]).toEqual({
      easing: 'ease-in-out',
      time: 0.5,
      value: 320,
    })
  })
})

describe('deleteVertexKeyframe', () => {
  test('should delete the selected frame from both coordinate tracks', () => {
    const document = insertVertexKeyframe({
      document: createDemoDocument(),
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

    expect(nextDocument?.motions[0]?.tracks).toEqual([createDemoDocument().motions[0]?.tracks[0]])
  })
})
