import {describe, expect, test} from 'vitest'

import source from '../../../../examples/development-model.json?raw'
import {parseDocument} from '../../parse-document'
import {createPhysicsState, evaluatePhysics} from '../physics'
import {composeParameterScene, composeParameterVertices} from '../../../deformation'
import {applySceneDeformers} from '../scene-deformation'

const parsed = parseDocument(source)
if (!parsed.ok) {
  throw new Error('Invalid development model')
}
const model = parsed.document

describe('development model side hair spring', () => {
  test('should trail the head, rebound, and settle with the rear hair responding later', () => {
    let physicsState = createPhysicsState(model)
    const frames = Array.from({length: 360}, () => {
      const result = evaluatePhysics({
        deltaTime: 1 / 60,
        document: model,
        parameterValues: {'face-x': 10, 'face-y': 10},
        physicsState,
      })
      physicsState = result.physicsState
      return result.parameterValues
    })
    for (const group of ['side', 'side-back', 'rear']) {
      for (const axis of ['x', 'y']) {
        const values = frames.map((frame) => frame[`hair-physics-${group}-${axis}`]!)
        expect(values[0]).toBeLessThan(-0.5)
        expect(Math.max(...values)).toBeGreaterThan(0.02)
        expect(Math.max(...values)).toBeLessThan(0.2)
        expect(values.at(-1)).toBeCloseTo(0, 4)
      }
    }
    const peakFrame = (id: string) => {
      const values = frames.map((frame) => frame[id]!)
      return values.indexOf(Math.max(...values))
    }
    expect(peakFrame('hair-physics-rear-x')).toBeGreaterThan(peakFrame('hair-physics-side-x'))
  })

  test.each([
    {base: 600, group: 'side', partIds: ['psd-139', 'psd-140']},
    {base: 675, group: 'side-back', partIds: ['psd-129', 'psd-130']},
    {base: 600, group: 'rear', partIds: ['psd-17', 'psd-18']},
  ])(
    'should keep $group roots attached and bend its surfaces without folding',
    ({base, group, partIds}) => {
      for (const partId of partIds) {
        const part = model.parts.find((candidate) => candidate.id === partId)!
        const render = (values: Readonly<Record<string, number>>) => {
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
        const area = (vertices: ReadonlyArray<number>, triangle: number) => {
          const [a, b, c] = part.mesh.indices
            .slice(triangle, triangle + 3)
            .map((index) => index * 2)
          return (
            (vertices[b!]! - vertices[a!]!) * (vertices[c! + 1]! - vertices[a! + 1]!) -
            (vertices[b! + 1]! - vertices[a! + 1]!) * (vertices[c!]! - vertices[a!]!)
          )
        }
        const poses = [-30, 0, 30].flatMap((yaw) => [-30, 0, 30].map((pitch) => ({pitch, yaw})))
        const bends = [-1.15, 1.15].flatMap((x) => [-1.15, 1.15].map((y) => ({x, y})))
        for (const {pitch, yaw} of poses) {
          const values = {'face-x': yaw, 'face-y': pitch}
          const neutral = render(values)
          for (const {x, y} of bends) {
            const vertices = render({
              ...values,
              [`hair-physics-${group}-x`]: x,
              [`hair-physics-${group}-y`]: y,
            })
            expect(vertices.every(Number.isFinite)).toBe(true)
            expect(
              vertices.some((coordinate, index) => Math.abs(coordinate - neutral[index]!) > 10),
            ).toBe(true)
            part.mesh.vertices.forEach((coordinate, index) => {
              if (index % 2 === 1 && coordinate <= base) {
                expect(vertices[index - 1]).toBe(neutral[index - 1])
                expect(vertices[index]).toBe(neutral[index])
              }
            })
            for (let triangle = 0; triangle < part.mesh.indices.length; triangle += 3) {
              expect(
                area(vertices, triangle) / area(neutral, triangle),
                `${partId} triangle ${triangle / 3}`,
              ).toBeGreaterThan(0.3)
            }
          }
        }
      }
    },
  )
})

describe('development model ear physics', () => {
  test.each(['left', 'right'])(
    'should give the %s ear a bounded rebound after head motion',
    (side) => {
      let physicsState = createPhysicsState(model)
      const frames = Array.from({length: 240}, () => {
        const result = evaluatePhysics({
          deltaTime: 1 / 60,
          document: model,
          parameterValues: {'face-x': 10, 'face-y': 10},
          physicsState,
        })
        physicsState = result.physicsState
        return result.parameterValues
      })
      for (const axis of ['x', 'y']) {
        const values = frames.map((frame) => frame[`ear-physics-${side}-${axis}`]!)
        expect(values[0]).toBeLessThan(-0.5)
        expect(Math.max(...values)).toBeGreaterThan(0.1)
        expect(Math.max(...values)).toBeLessThan(0.4)
        expect(values.at(-1)).toBeCloseTo(0, 3)
      }
    },
  )

  test.each([
    {partIds: ['psd-132', 'psd-133', 'psd-134'], side: 'left'},
    {partIds: ['psd-136', 'psd-137', 'psd-138'], side: 'right'},
  ])('should hold the $side ear base while bending its upper surfaces', ({partIds, side}) => {
    const poses = [-30, 0, 30].flatMap((yaw) => [-30, 0, 30].map((pitch) => ({pitch, yaw})))
    const bends = [-1, 1].flatMap((x) => [-1, 1].map((y) => ({x, y})))
    const scenarios = partIds.flatMap((partId) =>
      poses.flatMap((pose) => bends.map((bend) => ({...pose, ...bend, partId}))),
    )
    for (const {partId, yaw, pitch, x, y} of scenarios) {
      const part = model.parts.find((candidate) => candidate.id === partId)!
      const options = {
        document: model,
        parameterValues: {'face-x': yaw, 'face-y': pitch},
        partId,
        restVertices: part.mesh.vertices,
      }
      const neutral = composeParameterVertices(options)
      const vertices = composeParameterVertices({
        ...options,
        parameterValues: {
          ...options.parameterValues,
          [`ear-physics-${side}-x`]: x,
          [`ear-physics-${side}-y`]: y,
        },
      })
      expect(vertices.some((coordinate, i) => Math.abs(coordinate - neutral[i]!) > 1)).toBe(true)
      for (let i = 0; i < vertices.length; i += 2) {
        if (part.mesh.vertices[i + 1]! >= 680) {
          expect(vertices[i]).toBe(neutral[i])
          expect(vertices[i + 1]).toBe(neutral[i + 1])
        }
      }
      const area = (points: ReadonlyArray<number>, triangle: number) => {
        const [a, b, c] = part.mesh.indices.slice(triangle, triangle + 3).map((i) => i * 2)
        return (
          (points[b!]! - points[a!]!) * (points[c! + 1]! - points[a! + 1]!) -
          (points[b! + 1]! - points[a! + 1]!) * (points[c!]! - points[a!]!)
        )
      }
      for (let i = 0; i < part.mesh.indices.length; i += 3) {
        expect(area(vertices, i) / area(neutral, i)).toBeGreaterThan(0.2)
      }
    }
  })
})

describe('development model hair physics', () => {
  test('should delay the strand tips beyond the main bend', () => {
    let physicsState = createPhysicsState(model)
    const frames = Array.from({length: 180}, () => {
      const result = evaluatePhysics({
        deltaTime: 1 / 60,
        document: model,
        parameterValues: {'face-x': 10},
        physicsState,
      })
      physicsState = result.physicsState
      return result.parameterValues
    })
    for (const side of ['left', 'right']) {
      const tips = frames.map((frame) => frame[`hair-physics-strand-tip-${side}-x`]!)
      expect(Math.abs(tips[0]!)).toBeLessThan(0.01)
      expect(tips.indexOf(Math.min(...tips))).toBeGreaterThan(5)
      expect(Math.min(...tips)).toBeLessThan(-0.15)
      expect(Math.max(...tips)).toBeGreaterThan(0.03)
      expect(tips.at(-1)).toBeCloseTo(0, 2)
    }
  })

  test.each(['psd-141', 'psd-142'])(
    'should keep the roots attached and triangles unfolded while %s bends',
    (partId) => {
      const part = model.parts.find((candidate) => candidate.id === partId)!
      const verticesAt = (yaw: number, bend: number, tip: number) =>
        composeParameterVertices({
          document: model,
          parameterValues: {
            'face-x': yaw,
            'hair-physics-strand-tip-left-x': tip,
            'hair-physics-strand-tip-right-x': tip,
            'hair-physics-strand-x': bend,
          },
          partId,
          restVertices: part.mesh.vertices,
        })
      const area = (vertices: ReadonlyArray<number>, triangle: number) => {
        const [a, b, c] = part.mesh.indices.slice(triangle, triangle + 3).map((i) => i * 2)
        return (
          (vertices[b!]! - vertices[a!]!) * (vertices[c! + 1]! - vertices[a! + 1]!) -
          (vertices[b! + 1]! - vertices[a! + 1]!) * (vertices[c!]! - vertices[a!]!)
        )
      }
      const combinations = [-1.15, 0, 1.15].flatMap((bend) =>
        [-1.15, 0, 1.15].map((tip) => ({bend, tip})),
      )
      for (const yaw of [-30, 0, 30]) {
        const neutral = verticesAt(yaw, 0, 0)
        for (const {bend, tip} of combinations) {
          const vertices = verticesAt(yaw, bend, tip)
          for (let i = 0; i < vertices.length; i += 2) {
            if (part.mesh.vertices[i + 1]! <= 675) {
              expect(vertices[i]).toBe(neutral[i])
              expect(vertices[i + 1]).toBe(neutral[i + 1])
            }
          }
          for (let i = 0; i < part.mesh.indices.length; i += 3) {
            expect(area(vertices, i) / area(neutral, i)).toBeGreaterThan(0.2)
          }
        }
      }
    },
  )

  test('should trail head motion, rebound, and return to the posed shape', () => {
    let physicsState = createPhysicsState(model)
    const sample = (yaw: number) => {
      const result = evaluatePhysics({
        deltaTime: 1 / 60,
        document: model,
        parameterValues: {'face-x': yaw},
        physicsState,
      })
      physicsState = result.physicsState
      return result.parameterValues['hair-physics-strand-x']!
    }
    const turn = Array.from({length: 300}, () => sample(10))
    expect(turn[0]).toBeLessThan(-0.5)
    expect(Math.max(...turn)).toBeGreaterThan(0.05)
    expect(turn.at(-1)).toBeCloseTo(0, 3)
    const reverse = Array.from({length: 300}, () => sample(-10))
    expect(reverse[0]).toBeGreaterThan(0.5)
    expect(Math.min(...reverse)).toBeLessThan(-0.05)
    expect(reverse.at(-1)).toBeCloseTo(0, 3)
  })
})

describe('development model tail physics', () => {
  test.each([-1, 1])(
    'should lag, overshoot, rebound and settle after yaw reversal with idle=%s',
    (idle) => {
      let physicsState = createPhysicsState(model)
      const sample = (yaw: number) => {
        const result = evaluatePhysics({
          deltaTime: 1 / 60,
          document: model,
          parameterValues: {'full-body-x': yaw, 'tail-sway': idle},
          physicsState,
        })
        physicsState = result.physicsState
        expect(result.parameterValues['tail-sway']).toBe(idle)
        return result.parameterValues['tail-physics-x']!
      }
      const step = Array.from({length: 300}, () => sample(22))
      expect(Math.abs(step[0]!)).toBeLessThan(0.02)
      expect(Math.min(...step)).toBeLessThan(-0.65)
      expect(Math.min(...step)).toBeGreaterThan(-0.9)
      expect(step.at(-1)).toBeCloseTo(-0.55, 3)
      const reverse = Array.from({length: 300}, () => sample(-22))
      expect(reverse[0]).toBeLessThan(-0.5)
      expect(Math.max(...reverse)).toBeGreaterThan(0.75)
      expect(Math.max(...reverse)).toBeLessThan(1)
      expect(reverse.at(-1)).toBeCloseTo(0.55, 3)
      const released = Array.from({length: 300}, () => sample(0))
      expect(released[0]).toBeGreaterThan(0.5)
      expect(Math.min(...released)).toBeLessThan(-0.1)
      expect(released.at(-1)).toBeCloseTo(0, 3)
    },
  )
})
