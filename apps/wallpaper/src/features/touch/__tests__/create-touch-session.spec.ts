/** @vitest-environment jsdom */
import {expect, test, vi} from 'vitest'
import {DEFAULT_POFFO_TOUCH} from '@winter-love/wallpaper/settings/touch'
import {createTouchSession} from '../create-touch-session'

test('should solve different joint subsets when grabbing the root, middle or end of a four-joint chain', () => {
  const canvas = document.createElement('canvas')
  const parameters = ['a', 'b', 'c', 'd'].map((id, index) => ({
    axis: 'x' as const,
    defaultValue: 0,
    dimensions: 1,
    id,
    joint: true,
    maximum: 30,
    minimum: -30,
    name: id,
    parts: index === 0 ? ['root', 'middle', 'tip'] : index === 1 ? ['middle', 'tip'] : ['tip'],
  }))
  const player = {
    createParameterDrag: vi.fn(() => ({solve: () => ({})})),
    getParameterValues: vi.fn(() => ({})),
    patchParameterBlends: vi.fn(),
    pickPart: vi.fn(),
    releaseParameterPhysics: vi.fn(() => []),
  }
  const settings = {
    ...DEFAULT_POFFO_TOUCH,
    chains: [
      {
        enabled: true,
        id: 'tail',
        joints: parameters.map((parameter, index) => ({
          id: parameter.id,
          parameterId: parameter.id,
          response: [0.25, 0.5, 0.8, 1][index]!,
        })),
        name: '꼬리',
      },
    ],
    enabled: true,
    inverseKinematics: true,
  }
  const grab = (part: string, ids: readonly string[], mobility: readonly number[]) => {
    player.pickPart.mockReturnValue(part)
    const session = createTouchSession({
      canvas,
      offsets: () => ({}),
      parameters,
      player,
      point: {x: 0, y: 0},
      pointerId: 1,
      settings,
      write: vi.fn(),
    })
    expect(session?.joints).toBeDefined()
    expect(session?.parameters.map((parameter) => parameter.id)).toEqual(ids)
    expect(player.createParameterDrag).toHaveBeenLastCalledWith({
      mobility,
      parameterIds: ids,
      point: {x: 0, y: 0},
      preserveAngle: false,
    })
    session?.joints?.cancel()
  }
  grab('root', ['a'], [0.25])
  grab('middle', ['a', 'b'], [0.25, 0.5])
  grab('tip', ['a', 'b', 'c', 'd'], [0.25, 0.5, 0.8, 1])
})

test('should restrict configured touch parameters to their authored grab parts', () => {
  const canvas = document.createElement('canvas')
  const player = {
    createParameterDrag: vi.fn(),
    getParameterValues: vi.fn(() => ({})),
    patchParameterBlends: vi.fn(),
    pickPart: vi.fn(() => 'ear'),
    releaseParameterPhysics: vi.fn(() => []),
  }
  const parameters = ['head', 'ear'].map((id) => ({
    axis: 'x' as const,
    defaultValue: 0,
    dimensions: 1,
    id,
    maximum: 1,
    minimum: -1,
    parts: ['face', 'ear'],
  }))
  const session = createTouchSession({
    canvas,
    offsets: () => ({}),
    parameters,
    player,
    point: {x: 0, y: 0},
    pointerId: 1,
    settings: {
      ...DEFAULT_POFFO_TOUCH,
      enabled: true,
      parameters: {ear: {parts: ['ear']}, head: {parts: ['face']}},
    },
    write: vi.fn(),
  })
  expect(session?.parameters.map((parameter) => parameter.id)).toEqual(['ear'])
})
