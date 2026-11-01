import {cleanup, render, screen} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, expect, test, vi} from 'vitest'
import * as playerModule from '@winter-love/puppet/player'
import {cursorResponse} from '@winter-love/wallpaper/tracking/cursor-response'
import SPuppetCharacter from '../../../components/SPuppetCharacter'
import geometry from '../../../data/character-look.json'
import 'virtual:uno.css'

vi.mock('@winter-love/puppet/player', async (importOriginal) => {
  const actual = await importOriginal<typeof playerModule>()
  return {...actual, createPlayer: vi.fn(actual.createPlayer)}
})
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

test('should render the compact Poffo idle model and follow the desktop curve to every model limit', async () => {
  const rendered = Promise.withResolvers<void>()
  const [tracking, setTracking] = createSignal(false)
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
  const player = await vi.mocked(playerModule.createPlayer).mock.results[0]!.value
  player.pause()
  player.seek(2)
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
  const move = (x: number, y: number) =>
    globalThis.dispatchEvent(new PointerEvent('pointermove', {clientX: x, clientY: y}))
  setTracking(true)
  move(face.x + height / 4, face.y)
  await expect
    .poll(() => player.getParameterValue('ParamAngleX'), {timeout: 10_000})
    .toBeCloseTo(cursorResponse(0.25) * 30, 2)
  move(face.x + height, face.y)
  await expect.poll(() => player.getParameterValue('ParamAngleX'), {timeout: 10_000}).toBe(30)
  expect(player.getParameterValue('ParamEyeBallX')).toBe(1)
  player.seek(4)
  expect(player.getParameterValue('ParamAngleX')).toBe(30)
  move(face.x - height, face.y)
  await expect.poll(() => player.getParameterValue('ParamAngleX'), {timeout: 10_000}).toBe(-30)
  expect(player.getParameterValue('ParamEyeBallX')).toBe(-1)
  move(face.x, face.y - height)
  await expect.poll(() => player.getParameterValue('ParamAngleY'), {timeout: 10_000}).toBe(30)
  expect(player.getParameterValue('ParamEyeBallY')).toBe(1)
  move(face.x, face.y + height)
  await expect.poll(() => player.getParameterValue('ParamAngleY'), {timeout: 10_000}).toBe(-30)
  expect(player.getParameterValue('ParamEyeBallY')).toBe(-1)
  setTracking(false)
  player.seek(2)
  expect(player.getParameterValue('ParamEyeBallX')).toBeCloseTo(0.133333, 5)
  expect(player.getParameterValue('ParamEyeBallY')).toBeCloseTo(0.04, 5)
  expect(view.container.querySelector('canvas')).toBe(canvas)
  expect(playerModule.createPlayer).toHaveBeenCalledOnce()
}, 60_000)
