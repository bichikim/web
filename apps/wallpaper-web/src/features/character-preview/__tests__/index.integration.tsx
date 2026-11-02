import {cleanup, render, screen} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, expect, test, vi} from 'vitest'
import * as playerModule from '@winter-love/puppet/player'
import {cursorResponse} from '@winter-love/wallpaper/tracking/cursor-response'
import SPuppetCharacter from '../../../components/SPuppetCharacter'
import geometry from '../../../data/character-look.json'
import 'virtual:uno.css'

// Drive the gaze frame port to convergence independently of software WebGL throughput.
const frames = vi.hoisted(() => {
  const pending = new Map<number, FrameRequestCallback>()
  let sequence = 0
  let now = 0
  return {
    advance() {
      for (let index = 0; index < 32 && pending.size > 0; index += 1) {
        const callbacks = [...pending.values()]
        pending.clear()
        now += 100
        const timestamp = now
        callbacks.forEach((callback) => callback(timestamp))
      }
      if (pending.size > 0) {
        throw new Error('Character gaze did not settle within 32 frames')
      }
    },
    cancel(handle: number) {
      pending.delete(handle)
    },
    clear() {
      pending.clear()
      now = 0
    },
    request(callback: FrameRequestCallback) {
      sequence += 1
      pending.set(sequence, callback)
      return sequence
    },
  }
})
vi.mock('../look', async (importOriginal) => {
  const original = await importOriginal<typeof import('../look')>()
  return {
    ...original,
    connectCharacterLook: (options: Parameters<typeof original.connectCharacterLook>[0]) =>
      original.connectCharacterLook({...options, frames}),
  }
})
vi.mock('@winter-love/puppet/player', async (importOriginal) => {
  const original = await importOriginal<typeof import('@winter-love/puppet/player')>()
  // Parameter assertions retain CSS geometry while bounding software WebGL pixel work.
  const createPlayer = vi.fn<typeof original.createPlayer>((options) =>
    original.createPlayer({...options, resolution: 0.5}),
  )
  return {...original, createPlayer}
})
afterEach(() => {
  cleanup()
  frames.clear()
  vi.clearAllMocks()
})

test('should add default mouse tracking to the compact Poffo idle animation without accumulating values', async () => {
  const rendered = Promise.withResolvers<void>()
  const [tracking, setTracking] = createSignal(true)
  const view = render(() => (
    <div class="h-150 w-120">
      <SPuppetCharacter
        tracking={tracking()}
        playing={true}
        onReady={() => rendered.resolve()}
        onError={() => rendered.reject(new Error('Character preview failed'))}
      />
    </div>
  ))
  await rendered.promise
  const options = vi.mocked(playerModule.createPlayer).mock.calls[0]![0]
  const idle = options.document.motions?.find((motion) => motion.id === 'Idle:0')
  expect(idle).toMatchObject({duration: 4.983, loop: true})
  expect(idle?.tracks).toHaveLength(23)
  const player: playerModule.Player = await vi.mocked(playerModule.createPlayer).mock.results[0]!
    .value
  player.setBreath(false)
  player.setPhysicsPreview(false)
  player.pause()
  player.seek(4)
  const later = player.getParameterValues()
  player.seek(2)
  const earlier = player.getParameterValues()
  const blends = vi.spyOn(player, 'patchParameterBlends')
  const expected = (id: string, base: Readonly<Record<string, number>>, contribution: number) => {
    const parameter = options.document.parameters!.find((parameter) => parameter.id === id)!
    return Math.max(parameter.minimum, Math.min(parameter.maximum, base[id]! + contribution))
  }
  expect(player.getParameterValue('ParamEyeBallX')).toBeCloseTo(0.133333, 5)
  expect(player.getParameterValue('ParamEyeBallY')).toBeCloseTo(0.04, 5)
  const canvas = screen.getByLabelText('흰 고양이 캐릭터 실시간 렌더링')
  const bounds = canvas.getBoundingClientRect()
  const fit = Math.min(
    bounds.width / geometry.viewport.width,
    bounds.height / geometry.viewport.height,
  )
  const height = geometry.viewport.height * fit
  const face = {
    x: bounds.left + (bounds.width - geometry.viewport.width * fit) / 2 + geometry.face.x * fit,
    y: bounds.top + (bounds.height - geometry.viewport.height * fit) / 2 + geometry.face.y * fit,
  }
  const move = (x: number, y: number) => {
    globalThis.dispatchEvent(new PointerEvent('pointermove', {clientX: x, clientY: y}))
    frames.advance()
  }
  move(face.x + height / 4, face.y)
  await expect
    .poll(() => player.getParameterValue('ParamAngleX'), {timeout: 10_000})
    .toBeCloseTo(earlier.ParamAngleX! + cursorResponse(0.25) * 30, 2)
  await expect
    .poll(() => player.getParameterValue('ParamEyeBallX'), {timeout: 10_000})
    .toBeCloseTo(earlier.ParamEyeBallX! + cursorResponse(0.25), 3)
  player.seek(4)
  expect(player.getParameterValue('ParamAngleX')).toBeCloseTo(
    later.ParamAngleX! + cursorResponse(0.25) * 30,
    2,
  )
  player.seek(2)
  player.seek(2)
  expect(player.getParameterValue('ParamAngleX')).toBeCloseTo(
    earlier.ParamAngleX! + cursorResponse(0.25) * 30,
    2,
  )
  move(face.x + height, face.y)
  await expect.poll(() => blends.mock.lastCall?.[0].ParamAngleX?.value, {timeout: 10_000}).toBe(30)
  expect(player.getParameterValue('ParamAngleX')).toBe(expected('ParamAngleX', earlier, 30))
  expect(player.getParameterValue('ParamEyeBallX')).toBe(expected('ParamEyeBallX', earlier, 1))
  player.seek(4)
  expect(player.getParameterValue('ParamAngleX')).toBe(expected('ParamAngleX', later, 30))
  move(face.x - height, face.y)
  await expect.poll(() => blends.mock.lastCall?.[0].ParamAngleX?.value, {timeout: 10_000}).toBe(-30)
  expect(player.getParameterValue('ParamAngleX')).toBe(expected('ParamAngleX', later, -30))
  expect(player.getParameterValue('ParamEyeBallX')).toBe(expected('ParamEyeBallX', later, -1))
  move(face.x, face.y - height)
  await expect.poll(() => blends.mock.lastCall?.[0].ParamAngleY?.value, {timeout: 10_000}).toBe(30)
  expect(player.getParameterValue('ParamAngleY')).toBe(expected('ParamAngleY', later, 30))
  expect(player.getParameterValue('ParamEyeBallY')).toBe(expected('ParamEyeBallY', later, 1))
  move(face.x, face.y + height)
  await expect.poll(() => blends.mock.lastCall?.[0].ParamAngleY?.value, {timeout: 10_000}).toBe(-30)
  expect(player.getParameterValue('ParamAngleY')).toBe(expected('ParamAngleY', later, -30))
  expect(player.getParameterValue('ParamEyeBallY')).toBe(expected('ParamEyeBallY', later, -1))
  setTracking(false)
  player.seek(2)
  expect(player.getParameterValue('ParamEyeBallX')).toBeCloseTo(0.133333, 5)
  expect(player.getParameterValue('ParamEyeBallY')).toBeCloseTo(0.04, 5)
  expect(view.container.querySelector('canvas')).toBe(canvas)
  expect(playerModule.createPlayer).toHaveBeenCalledOnce()
}, 60_000)
