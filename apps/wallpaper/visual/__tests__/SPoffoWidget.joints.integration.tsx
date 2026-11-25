import {cleanup, fireEvent, render, screen} from '@solidjs/testing-library'
import {afterEach, expect, test, vi} from 'vitest'
import {page} from 'vitest/browser'
import * as playerModule from '@winter-love/puppet/player'
import * as rendererModule from '../../../../packages/puppet/src/player/rendering/create-player-renderer'
import {DEFAULT_POFFO_TOUCH} from '@winter-love/wallpaper/settings/touch'
import {useWidget} from '../../src/features/poffo/use-widget'
import {SPoffoWidget} from '../../src/components/SPoffoWidget'
import {jointChainDocument} from '../fixtures/joint-chain'
import 'virtual:uno.css'
vi.mock('../../src/features/poffo/use-widget', () => ({useWidget: vi.fn()}))
vi.mock('../../src/features/poffo/use-widget-hit-test', () => ({
  useWidgetHitTest: () => ({afterRender: () => undefined}),
}))
vi.mock('@tauri-apps/api/core', async (original) => ({
  ...(await original<typeof import('@tauri-apps/api/core')>()),
  isTauri: () => false,
}))
vi.mock('@winter-love/puppet/player', async (original) => {
  const actual = await original<typeof playerModule>()
  return {...actual, createPlayer: vi.fn(actual.createPlayer)}
})
vi.mock(
  '../../../../packages/puppet/src/player/rendering/create-player-renderer',
  async (original) => {
    const actual = await original<typeof rendererModule>()
    return {...actual, createPlayerRenderer: vi.fn(actual.createPlayerRenderer)}
  },
)
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.clearAllMocks()
})

test('should drag every segment with different active joints while children follow without stretching', async () => {
  const ready = Promise.withResolvers<playerModule.Player>()
  const errors = vi.fn((cause) => ready.reject(cause))
  const create = vi.mocked(playerModule.createPlayer).getMockImplementation()!
  vi.mocked(playerModule.createPlayer).mockImplementationOnce(async (options) => {
    // This rig test owns a manual frame clock; evaluate each sampled pose synchronously.
    const player = await create({...options, buffering: false})
    ready.resolve(player)
    return player
  })
  const document = jointChainDocument()
  vi.mocked(useWidget).mockReturnValue({
    agentBindings: () => undefined,
    assetId: () => 'custom-chain',
    drag: vi.fn(),
    error: () => null,
    lipsync: () => undefined,
    load: async () => JSON.stringify(document),
    menuActions: () => [],
    motionId: () => null,
    report: errors,
    saveSize: vi.fn(),
    semanticBindings: () => undefined,
    toggleAction: vi.fn(),
    touch: () => ({
      ...DEFAULT_POFFO_TOUCH,
      chains: [
        {
          enabled: true,
          id: 'tail',
          joints: document.parameters!.map((parameter) => ({
            id: parameter.id,
            parameterId: parameter.id,
            response: 1,
          })),
          name: '꼬리',
        },
      ],
      enabled: true,
      inverseKinematics: true,
    }),
    tracking: () => 'off',
    trackingBindings: () => undefined,
    trackingOptions: () => undefined,
  })
  render(() => <SPoffoWidget id="custom-joints" />)
  const player = await ready.promise
  await vi.mocked(playerModule.createPlayer).mock.results[0]!.value
  player.pause()
  const renderer = await vi.mocked(rendererModule.createPlayerRenderer).mock.results[0]!.value
  const origin = renderer.toDocumentPoint({x: 0, y: 0})
  const step = renderer.toDocumentPoint({x: 1, y: 1})
  const canvasPoint = (x: number, y: number) => ({
    x: (x - origin.x) / (step.x - origin.x),
    y: (y - origin.y) / (step.y - origin.y),
  })
  const vertices = (index: number) => renderer.getPartVertices(`segment-${index}`)!
  const center = (index: number) => {
    const points = vertices(index)
    return canvasPoint((points[0]! + points[4]!) / 2, (points[1]! + points[5]!) / 2)
  }
  const canvas = screen.getByLabelText<HTMLCanvasElement>('Poffo 배경')
  vi.spyOn(canvas, 'setPointerCapture').mockImplementation(() => undefined)
  const picking = vi.spyOn(player, 'createParameterDrag')
  const pointer = (type: string, point: {x: number; y: number}) =>
    fireEvent(
      canvas,
      new PointerEvent(type, {
        bubbles: true,
        button: 0,
        cancelable: true,
        clientX: point.x,
        clientY: point.y,
        pointerId: 1,
      }),
    )
  let identity = 0
  let time = 0
  const frames = new Map<number, FrameRequestCallback>()
  const request = vi.spyOn(globalThis, 'requestAnimationFrame').mockImplementation((callback) => {
    identity += 1
    frames.set(identity, callback)
    return identity
  })
  const cancel = vi.spyOn(globalThis, 'cancelAnimationFrame').mockImplementation((id) => {
    frames.delete(id)
  })
  const advance = (elapsed: number) => {
    time += elapsed
    const current = [...frames.values()]
    frames.clear()
    current.forEach((callback) => callback(time))
  }
  for (const index of [0, 1, 2, 3]) {
    const before = center(index)
    const endBefore = center(3)
    expect(player.pickPart(before)).toBe(`segment-${index}`)
    player.patchParameterBlends({'joint-0': {mode: 'overwrite', value: 10}}, 'interaction')
    const target = center(index)
    player.patchParameterBlends({'joint-0': undefined}, 'interaction')
    pointer('pointerdown', before)
    const ids = Array.from({length: index + 1}, (_, position) => `joint-${position}`)
    expect(picking.mock.lastCall?.[0].parameterIds).toEqual(ids)
    pointer('pointermove', target)
    const after = center(index)
    expect(Math.abs(player.getParameterValue(`joint-${index}`)!)).toBeGreaterThan(0.01)
    expect(Math.hypot(after.x - target.x, after.y - target.y)).toBeLessThan(1)
    expect(Math.hypot(center(3).x - endBefore.x, center(3).y - endBefore.y)).toBeGreaterThan(5)
    for (const following of document.parameters!.slice(index + 1)) {
      expect(player.getParameterValue(following.id)).toBe(0)
    }
    for (const position of [0, 1, 2, 3]) {
      const points = vertices(position)
      expect(Math.hypot(points[2]! - points[0]!, points[3]! - points[1]!)).toBeCloseTo(80, 2)
    }
    pointer('pointerup', target)
    advance(0)
    advance(450)
    expect(document.parameters!.map((parameter) => player.getParameterValue(parameter.id))).toEqual(
      [0, 0, 0, 0],
    )
  }
  request.mockRestore()
  cancel.mockRestore()
  await page
    .getByRole('main', {name: 'Poffo 위젯'})
    .screenshot({path: '__screenshots__/four-joint-chain.png'})
  expect(errors).not.toHaveBeenCalled()
})
