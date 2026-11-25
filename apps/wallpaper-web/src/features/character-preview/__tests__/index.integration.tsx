import {cleanup, render, screen} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, expect, test, vi} from 'vitest'
import {page} from 'vitest/browser'
import * as playerModule from '@winter-love/puppet/player'
import {cursorResponse} from '@winter-love/wallpaper/tracking/cursor-response'
import SPuppetCharacter from '../../../components/SPuppetCharacter'
import {createMouthTrack, sampleMouthTrack} from '../../character-speech/mouth-track'
import type {MouthPose} from '../../character-speech/types'
import geometry from '../../../data/character-look.json'
import {frames} from './fixtures/frames'
import 'virtual:uno.css'

afterEach(() => {
  cleanup()
  frames.clear()
  vi.clearAllMocks()
})

test('should animate the rendered character through short vowels and final lip closure', async () => {
  const ready = Promise.withResolvers<void>()
  const [mouth, setMouth] = createSignal<MouthPose | null>(null)
  const view = render(() => (
    <div class="h-50 w-40">
      <SPuppetCharacter
        mouth={mouth()}
        tracking={false}
        onReady={() => ready.resolve()}
        onError={() => ready.reject(new Error('Character preview failed'))}
      />
    </div>
  ))
  await ready.promise
  const player: playerModule.Player = await vi.mocked(playerModule.createPlayer).mock.results[0]!
    .value
  expect(view.getByLabelText('흰 고양이 캐릭터 실시간 렌더링')).toBeVisible()
  const sampleRate = 1000
  const short = createMouthTrack({sampleRate, samples: new Float32Array(50).fill(0.1)}, '빠')
  const final = createMouthTrack({sampleRate, samples: new Float32Array(200).fill(0.1)}, '암')
  await expect.poll(() => playerModule.getPlayerBufferingInfo(player).status).toBe('active')
  const mouthOpen = () => player.getParameterValue('ParamMouthOpenY')!
  setMouth(sampleMouthTrack(short, 0.02))
  await expect.poll(mouthOpen).toBeGreaterThan(0.2)
  setMouth(sampleMouthTrack(final, 0.1))
  await expect.poll(mouthOpen).toBeGreaterThan(0.6)
  const open = mouthOpen()
  setMouth(sampleMouthTrack(final, 0.18))
  await expect.poll(mouthOpen).toBeLessThan(open * 0.8)
}, 60_000)

test('should add default mouse tracking to the compact Poffo idle animation without accumulating values', async () => {
  const rendered = Promise.withResolvers<void>()
  const [tracking, setTracking] = createSignal(true)
  const view = render(() => (
    <div class="h-50 w-40">
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
  await playerModule.configurePlayerBuffering(player, {enabled: false})
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
  expect(player.getParameterValue('ParamAngleX')).toBeCloseTo(
    earlier.ParamAngleX! + cursorResponse(0.25) * 30,
    2,
  )
  expect(player.getParameterValue('ParamEyeBallX')).toBeCloseTo(
    earlier.ParamEyeBallX! + cursorResponse(0.25),
    3,
  )
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
  expect(blends.mock.lastCall?.[0].ParamAngleX?.value).toBe(30)
  expect(player.getParameterValue('ParamAngleX')).toBe(expected('ParamAngleX', earlier, 30))
  expect(player.getParameterValue('ParamEyeBallX')).toBe(expected('ParamEyeBallX', earlier, 1))
  player.seek(4)
  expect(player.getParameterValue('ParamAngleX')).toBe(expected('ParamAngleX', later, 30))
  move(face.x - height, face.y)
  expect(blends.mock.lastCall?.[0].ParamAngleX?.value).toBe(-30)
  expect(player.getParameterValue('ParamAngleX')).toBe(expected('ParamAngleX', later, -30))
  expect(player.getParameterValue('ParamEyeBallX')).toBe(expected('ParamEyeBallX', later, -1))
  move(face.x, face.y - height)
  expect(blends.mock.lastCall?.[0].ParamAngleY?.value).toBe(30)
  expect(player.getParameterValue('ParamAngleY')).toBe(expected('ParamAngleY', later, 30))
  expect(player.getParameterValue('ParamEyeBallY')).toBe(expected('ParamEyeBallY', later, 1))
  move(face.x, face.y + height)
  expect(blends.mock.lastCall?.[0].ParamAngleY?.value).toBe(-30)
  expect(player.getParameterValue('ParamAngleY')).toBe(expected('ParamAngleY', later, -30))
  expect(player.getParameterValue('ParamEyeBallY')).toBe(expected('ParamEyeBallY', later, -1))
  setTracking(false)
  player.seek(2)
  expect(player.getParameterValue('ParamEyeBallX')).toBeCloseTo(0.133333, 5)
  expect(player.getParameterValue('ParamEyeBallY')).toBeCloseTo(0.04, 5)
  expect(view.container.querySelector('canvas')).toBe(canvas)
  expect(playerModule.createPlayer).toHaveBeenCalledOnce()
}, 60_000)

test('should render the updated Ash with Worker buffering and independent clothing, action and speech', async () => {
  const rendered = Promise.withResolvers<void>()
  const [coatOff, setCoatOff] = createSignal(false)
  const [expressionId, setExpression] = createSignal<string | null>('손하트')
  const [mouth, setMouth] = createSignal<{form: number; open: number} | null>(null)
  render(() => (
    <div class="h-100 w-80">
      <SPuppetCharacter
        coatOff={coatOff()}
        expressionId={expressionId()}
        mouth={mouth()}
        tracking={false}
        onReady={() => rendered.resolve()}
        onError={() => rendered.reject(new Error('Character preview failed'))}
      />
    </div>
  ))
  await rendered.promise
  const options = vi.mocked(playerModule.createPlayer).mock.calls[0]![0]
  expect(options.buffering).toBe(true)
  expect(options.document.viewport).toEqual(geometry.viewport)
  expect(options.document.parts.some((part) => part.id === 'waist-pouch-rear-strap')).toBe(true)
  expect(
    options.document.parameters?.some((parameter) => parameter.id === 'TouchHairFrontLeft19'),
  ).toBe(true)
  expect(
    options.document.parameters?.some((parameter) => parameter.id === 'TouchHairSideLeft19'),
  ).toBe(true)
  const player = await vi.mocked(playerModule.createPlayer).mock.results[0]!.value
  await expect.poll(() => playerModule.getPlayerBufferingInfo(player).status).toBe('active')
  const action = options.document.expressions!.find((expression) => expression.id === '손하트')!
    .parameters[0]!
  await expect.poll(() => player.getParameterValue(action.parameterId)).toBeCloseTo(action.value)
  setCoatOff(true)
  await expect.poll(() => player.getParameterValue('Param49')).toBeCloseTo(1)
  expect(player.getParameterValue(action.parameterId)).toBeCloseTo(action.value)
  setMouth({form: -1, open: 0.8})
  await expect.poll(() => player.getParameterValue('ParamMouthOpenY')).toBeCloseTo(0.8)
  await page
    .getByLabelText('흰 고양이 캐릭터 실시간 렌더링')
    .screenshot({path: '__screenshots__/updated-ash-coat-off.png'})
  setCoatOff(false)
  await expect.poll(() => player.getParameterValue('Param49')).toBeCloseTo(0)
  expect(player.getParameterValue(action.parameterId)).toBeCloseTo(action.value)
  setExpression(null)
  setMouth(null)
  await expect.poll(() => player.getParameterValue('ParamMouthOpenY')).toBeCloseTo(0)
  expect(playerModule.getPlayerBufferingInfo(player).status).toBe('active')
}, 30_000)
