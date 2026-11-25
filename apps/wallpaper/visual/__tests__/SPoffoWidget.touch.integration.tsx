import {mockNativeWebview} from '../fixtures/native-webview'
import {cleanup, fireEvent, render, screen} from '@solidjs/testing-library'
import {afterEach, beforeEach, expect, test, vi} from 'vitest'
import {createSignal} from 'solid-js'
import * as playerModule from '@winter-love/puppet/player'
import {DEFAULT_POFFO_TOUCH} from '@winter-love/wallpaper/settings/touch'
import {useWidget} from '../../src/features/poffo/use-widget'
import {SPoffoWidget} from '../../src/components/SPoffoWidget'
import 'virtual:uno.css'
import ashUrl from '../../../wallpaper-web/public/models/white-cat/model.poffo?url'

vi.mock('../../src/features/poffo/use-widget', () => ({useWidget: vi.fn()}))
vi.mock('../../src/features/poffo/use-widget-hit-test', () => ({
  useWidgetHitTest: () => ({afterRender: () => undefined}),
}))
vi.mock('@tauri-apps/api/webview', () => ({getCurrentWebview: vi.fn()}))
beforeEach(() => {
  mockNativeWebview()
})
vi.mock('@tauri-apps/api/core', async (original) => ({
  ...(await original<typeof import('@tauri-apps/api/core')>()),
  invoke: vi.fn(async () => undefined),
  isTauri: () => true,
}))
const native = {
  outerPosition: vi.fn(async () => ({x: 100, y: 200})),
  scaleFactor: vi.fn(async () => 1),
  setPosition: vi.fn(async () => undefined),
}
vi.mock('@tauri-apps/api/window', async (original) => ({
  ...(await original<typeof import('@tauri-apps/api/window')>()),
  getCurrentWindow: () => native,
}))
vi.mock('@winter-love/puppet/player', async (original) => {
  const actual = await original<typeof playerModule>()
  return {...actual, createPlayer: vi.fn(actual.createPlayer)}
})
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.clearAllMocks()
})

test('should touch bundled Ash, return to its pose, and arm positioning only after a stationary hold', async () => {
  const blob = await fetch(ashUrl).then((response) => response.blob())
  const ready = Promise.withResolvers<playerModule.Player>()
  const errors = vi.fn((cause: unknown) => ready.reject(cause))
  const create = vi.mocked(playerModule.createPlayer).getMockImplementation()!
  vi.mocked(playerModule.createPlayer).mockImplementationOnce(async (options) => {
    const player = await create(options)
    ready.resolve(player)
    return player
  })
  const [touch, setTouch] = createSignal({...DEFAULT_POFFO_TOUCH, enabled: true, parameters: {}})
  vi.mocked(useWidget).mockReturnValue({
    agentBindings: () => undefined,
    assetId: () => 'builtin:ash',
    drag: vi.fn(),
    error: () => null,
    lipsync: () => undefined,
    load: async () => blob,
    menuActions: () => [],
    motionId: () => null,
    report: errors,
    saveSize: vi.fn(),
    semanticBindings: () => undefined,
    toggleAction: vi.fn(),
    touch,
    tracking: () => 'off',
    trackingBindings: () => undefined,
    trackingOptions: () => undefined,
  })
  render(() => <SPoffoWidget id="ash-touch" />)
  const player = await ready.promise
  await vi.mocked(playerModule.createPlayer).mock.results[0]!.value
  player.pause()
  player.setPhysicsPreview(false)
  player.setBreath(false)
  player.setEyeBlink(false)
  player.resetPhysics()
  await playerModule.flushPlayerInputs(player)
  const canvas = screen.getByLabelText<HTMLCanvasElement>('Poffo 배경')
  const capture = vi.spyOn(canvas, 'setPointerCapture').mockImplementation(() => undefined)
  const parameters = player.getParameterValues()
  let point: {x: number; y: number} | undefined
  for (let y = 150; y < 500 && point === undefined; y += 20) {
    for (let x = 250; x < 650 && point === undefined; x += 20) {
      if (player.pickPart({x, y}) !== undefined) {
        point = {x, y}
      }
    }
  }
  expect(point).toBeDefined()
  const position = point!
  let clock = 0
  let identity = 0
  const frames = new Map<number, FrameRequestCallback>()
  vi.spyOn(globalThis, 'requestAnimationFrame').mockImplementation((callback) => {
    identity += 1
    frames.set(identity, callback)
    return identity
  })
  vi.spyOn(globalThis, 'cancelAnimationFrame').mockImplementation((id) => {
    frames.delete(id)
  })
  const advance = (time: number) => {
    clock = time
    const callbacks = [...frames.values()]
    frames.clear()
    callbacks.forEach((callback) => callback(clock))
  }
  const pointer = (type: string, x = position.x, y = position.y) => {
    const event = new PointerEvent(type, {
      bubbles: true,
      button: 0,
      cancelable: true,
      clientX: x,
      clientY: y,
      pointerId: 1,
      screenX: x,
      screenY: y,
    })
    Object.defineProperty(event, 'timeStamp', {value: clock})
    return fireEvent(canvas, event)
  }
  pointer('pointerdown')
  pointer('pointermove', position.x + 24, position.y + 12)
  pointer('pointerup', position.x + 24, position.y + 12)
  await playerModule.flushPlayerInputs(player)
  expect(player.getParameterValues()).toEqual(parameters)
  setTouch({...touch(), parameters: {ParamAngleX: {axis: 'x'}}})
  pointer('pointerdown')
  pointer('pointermove', position.x + 24, position.y + 12)
  await playerModule.flushPlayerInputs(player)
  const touched = player.getParameterValues()
  expect(touched.ParamAngleX).not.toBe(parameters.ParamAngleX)
  expect(Object.keys(touched).filter((id) => touched[id] !== parameters[id])).toEqual([
    'ParamAngleX',
  ])
  expect(native.setPosition).not.toHaveBeenCalled()
  pointer('pointerup', position.x + 24, position.y + 12)
  fireEvent(canvas, new PointerEvent('lostpointercapture', {bubbles: true, pointerId: 1}))
  advance(0)
  advance(450)
  await playerModule.flushPlayerInputs(player)
  expect(player.getParameterValues()).toEqual(parameters)
  advance(1000)
  pointer('pointerdown')
  advance(1750)
  const progress = screen.getByRole('progressbar', {name: '캐릭터 이동 준비'})
  expect(progress).toHaveAttribute('aria-valuemax', '1.5')
  expect(progress).toHaveAttribute('aria-valuenow', '0.75')
  expect(progress.getBoundingClientRect().width).toBe(40)
  const ring = progress.querySelector('circle[pathLength="1"]')!
  expect(Number.parseFloat(getComputedStyle(ring).strokeDashoffset)).toBeCloseTo(0.5)
  advance(2499)
  expect(native.setPosition).not.toHaveBeenCalled()
  advance(2500)
  await expect
    .poll(() =>
      screen.getByRole('main', {name: 'Poffo 위젯'}).classList.contains('cursor-grabbing'),
    )
    .toBe(true)
  expect(native.setPosition).not.toHaveBeenCalled()
  pointer('pointermove', position.x + 20, position.y + 10)
  await expect
    .poll(() => native.setPosition.mock.lastCall)
    .toEqual([expect.objectContaining({x: 120, y: 210})])
  expect(player.getParameterValues()).toEqual(parameters)
  pointer('pointerup', position.x + 20, position.y + 10)
  expect(screen.queryByRole('progressbar')).toBeNull()
  const count = native.setPosition.mock.calls.length
  pointer('pointerdown')
  pointer('pointermove', position.x + 20, position.y)
  advance(12000)
  expect(native.setPosition).toHaveBeenCalledTimes(count)
  expect(screen.queryByRole('progressbar')).toBeNull()
  pointer('pointerup', position.x + 20, position.y)
  expect(capture).toHaveBeenCalled()
  expect(errors).not.toHaveBeenCalled()
})
