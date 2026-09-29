import {describe, expect, test} from 'vitest'

import source from '../../../../examples/development-model.json?raw'
import {
  composeParameterPartProperties,
  composeParameterScene,
  composeParameterVertices,
} from '../../../deformation'
import {parseDocument} from '../../parse-document'
import {sampleMotionParameterValues} from '../motion'
import {applySceneDeformers} from '../scene-deformation'

const parsed = parseDocument(source)
if (!parsed.ok) {
  throw new Error('Invalid development model')
}
const model = parsed.document
const preview = model.motions.find((motion) => motion.id === '발음 립싱크 미리보기')!
const sample = (time: number) =>
  sampleMotionParameterValues({
    motion: preview,
    parameters: model.parameters,
    parameterValues: {},
    time,
  })
const render = (partId: string, values: Readonly<Record<string, number>>) => {
  const part = model.parts.find((candidate) => candidate.id === partId)!
  const vertices = [
    ...composeParameterVertices({
      document: model,
      parameterValues: values,
      partId,
      restVertices: part.mesh.vertices,
    }),
  ]
  applySceneDeformers({
    document: {...model, scene: composeParameterScene(model, values)},
    verticesByPartId: new Map([[partId, vertices]]),
  })
  return vertices
}
const bounds = (vertices: ReadonlyArray<number>) => {
  const xs = vertices.filter((_, index) => index % 2 === 0)
  const ys = vertices.filter((_, index) => index % 2 === 1)
  return {
    bottom: Math.max(...ys),
    left: Math.min(...xs),
    right: Math.max(...xs),
    top: Math.min(...ys),
  }
}

describe('development model articulation', () => {
  test.each([-30, 30])(
    'should foreshorten an open mouth and shift the tongue behind the lips at yaw %s',
    (yaw) => {
      const pose = {'mouth-open': 1, 'mouth-shape': 1}
      const front = bounds(render('psd-88', pose))
      const turned = bounds(render('psd-88', {...pose, 'face-x': yaw}))
      expect(turned.right - turned.left).toBeLessThan((front.right - front.left) * 0.95)
      const center = (partId: string, angle: number) => {
        const box = bounds(render(partId, {...pose, 'face-x': angle}))
        return (box.left + box.right) / 2
      }
      const relative = (angle: number) => center('psd-83', angle) - center('psd-88', angle)
      expect((relative(yaw) - relative(0)) * Math.sign(yaw)).toBeLessThan(-8)
    },
  )

  test('should change tongue surface height with pitch while retaining the open lip aperture', () => {
    const pose = {'mouth-open': 1, 'mouth-shape': 1}
    const up = bounds(render('psd-83', {...pose, 'face-y': 30}))
    const down = bounds(render('psd-83', {...pose, 'face-y': -30}))
    expect(up.bottom - up.top).toBeLessThan((down.bottom - down.top) * 0.8)
  })

  test('should distinguish wide vowels from rounded vowels', () => {
    const width = (time: number) => {
      const box = bounds(render('psd-88', sample(time)))
      return box.right - box.left
    }
    expect(width(3)).toBeGreaterThan(width(1))
    expect(width(4)).toBeLessThan(width(1) * 0.7)
    expect(width(5)).toBeLessThan(width(4))
  })

  test.each([-1, 0, 1])(
    'should seal the lips despite opening and tongue input at shape %s',
    (shape) => {
      const values = {
        'mouth-open': 1,
        'mouth-press': 1,
        'mouth-round': 1,
        'mouth-shape': shape,
        'mouth-smile': 1,
        'tongue-raise': 1,
      }
      expect(render('psd-88', values)).toEqual(render('psd-88', {}))
      expect(render('psd-91', values)).toEqual(render('psd-91', {}))
      for (const partId of ['psd-79', 'psd-80', 'psd-81', 'psd-83', 'psd-84', 'psd-85']) {
        expect(
          composeParameterPartProperties({document: model, parameterValues: values, partId})
            .opacity,
        ).toBe(0)
      }
    },
  )

  test('should lift the tongue only when the lips are open', () => {
    expect(render('psd-83', {'tongue-raise': 1})).toEqual(render('psd-83', {}))
    const neutral = render('psd-83', {'mouth-open': 0.65})
    const raised = render('psd-83', {'mouth-open': 0.65, 'tongue-raise': 1})
    expect(bounds(raised).top).toBeCloseTo(bounds(neutral).top - 22, 6)
  })
})
