import {cleanup, fireEvent, render, screen} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, expect, test, vi} from 'vitest'
import * as playerModule from '@winter-love/puppet/player'
import {createLibraryRepository} from '@winter-love/wallpaper/settings/library-repository'
import {useWidget} from '../../src/features/poffo/use-widget'
import {usePuppet} from '../../src/features/background/use-puppet'
import {SPoffoMotionAdjustment} from '../../src/components/SPoffoMotionAdjustment'
import {SPoffoTrackingAdjustment} from '../../src/components/SPoffoTrackingAdjustment'
import ashUrl from '../../../wallpaper-web/public/models/white-cat/model.poffo?url'
import 'virtual:uno.css'

vi.mock('@winter-love/puppet/player', async (importOriginal) => {
  const actual = await importOriginal<typeof playerModule>()
  return {...actual, createPlayer: vi.fn(actual.createPlayer)}
})
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

test('should follow cursor distance and retain gaze across speech saves and idle loops', async () => {
  const actual = await vi.importActual<typeof playerModule>('@winter-love/puppet/player')
  const repository = createLibraryRepository('wallpaper-library')
  const widget = await repository.addWidget('builtin:ash')
  await repository.trackWidget(widget.id, 'cursor')
  await repository.bindWidget(widget.id, {headX: {parameterId: 'ParamAngleX'}})
  await repository.configureTracking(widget.id, {headResponseX: 1})
  await repository.configureSpeech(widget.id, {
    enabled: true,
    lipsync: {source: 'voice'},
    x: 0.9,
    y: 0.05,
  })
  const blob = await fetch(ashUrl).then((response) => response.blob())
  const completed = Promise.withResolvers<void>()
  const ready = Promise.withResolvers<void>()
  let player: playerModule.Player | null = null
  let collecting = false
  let previous = 0
  let loops = 0
  let minimum = Infinity
  const errors = vi.fn((cause: unknown) => {
    ready.reject(cause)
    completed.resolve()
  })
  vi.mocked(playerModule.createPlayer).mockImplementationOnce((options) =>
    actual.createPlayer({
      ...options,
      onFrame: (frame) => {
        if (collecting && player !== null) {
          loops += Number(frame.time < previous)
          previous = frame.time
          minimum = Math.min(minimum, player.getParameterValue('ParamAngleX')!)
          if (loops >= 2 || minimum !== 20) {
            completed.resolve()
          }
        }
      },
    }),
  )
  const view = render(() => {
    const selected = useWidget(() => widget.id)
    const [canvas, setCanvas] = createSignal<HTMLCanvasElement | null>(null)
    usePuppet({
      assetId: selected.assetId,
      canvas,
      load: async () => blob,
      onAfterRender: () => ready.resolve(),
      onError: errors,
      tracking: () => selected.tracking() ?? 'off',
      trackingBindings: selected.trackingBindings,
      trackingOptions: selected.trackingOptions,
    })
    return (
      <>
        <div class="h-120 w-100">
          <canvas ref={setCanvas} role="img" aria-label="시선 캐릭터" class="h-full w-full" />
        </div>
        <SPoffoTrackingAdjustment
          mode="cursor"
          section="head"
          value={selected.trackingOptions()}
          onChange={(options) => repository.configureTracking(widget.id, options)}
        />
        <SPoffoMotionAdjustment
          target="eye"
          value={selected.trackingOptions()}
          onChange={(options) => repository.configureTracking(widget.id, options)}
        />
        <output aria-label="음성 입력">{selected.lipsync()?.source}</output>
        <output aria-label="도달 거리">{selected.trackingOptions()?.cursorReach ?? 1}</output>
        <output aria-label="반응 배율">
          {selected.trackingOptions()?.headResponseX ?? 1}/
          {selected.trackingOptions()?.eyeResponseX ?? 1}
        </output>
        <output aria-label="추적 범위">
          {selected.trackingOptions()?.headMaximumX ?? 30}/
          {selected.trackingOptions()?.eyeMaximumX ?? 1}/
          {selected.trackingOptions()?.headMinimumX ?? -30}/
          {selected.trackingOptions()?.eyeMinimumX ?? -1}
        </output>
      </>
    )
  })
  try {
    await ready.promise
    expect(playerModule.createPlayer).toHaveBeenCalledOnce()
    player = await vi.mocked(playerModule.createPlayer).mock.results[0]!.value
    if (player === null) {
      throw new Error('Expected the character player to be ready')
    }
    const canvas = screen.getByRole('img', {name: '시선 캐릭터'})
    const bounds = canvas.getBoundingClientRect()
    const reach = bounds.height
    const follow = (horizontal: number, vertical = 0) =>
      globalThis.dispatchEvent(
        new PointerEvent('pointermove', {
          clientX: bounds.left + bounds.width / 2 + horizontal,
          clientY: bounds.top + bounds.height * 0.3 - vertical,
        }),
      )
    follow(reach * 0.25)
    await expect
      .poll(() => player!.getParameterValue('ParamAngleX'), {timeout: 3000})
      .toBeCloseTo(13.61279273, 6)
    expect(player.getParameterValue('ParamEyeBallX')).toBeCloseTo(0.453759758, 6)
    follow(reach)
    await expect.poll(() => player!.getParameterValue('ParamAngleX'), {timeout: 3000}).toBe(30)
    expect(player.getParameterValue('ParamEyeBallX')).toBe(1)
    follow(-reach)
    await expect.poll(() => player!.getParameterValue('ParamAngleX'), {timeout: 3000}).toBe(-30)
    expect(player.getParameterValue('ParamEyeBallX')).toBe(-1)
    follow(0)
    await expect
      .poll(() => player!.getParameterValue('ParamAngleX'), {timeout: 3000})
      .toBeCloseTo(0, 1)
    follow((reach * 0.25) / Math.sqrt(2), (reach * 0.25) / Math.sqrt(2))
    await expect
      .poll(() => player!.getParameterValue('ParamAngleX'), {timeout: 3000})
      .toBeCloseTo(13.61279273 / Math.sqrt(2), 1)
    expect(player.getParameterValue('ParamAngleY')).toBeCloseTo(13.61279273 / Math.sqrt(2), 1)
    const edit = (name: string, value: string) => {
      const input = screen.getByRole('spinbutton', {name})
      fireEvent.input(input, {target: {value}})
      fireEvent.blur(input)
    }
    edit('얼굴 좌우 최대', '20')
    await expect
      .poll(() => screen.getByRole('status', {name: '추적 범위'}).textContent)
      .toBe('20/1/-30/-1')
    edit('눈동자 좌우 최대', '0.5')
    await expect
      .poll(() => screen.getByRole('status', {name: '추적 범위'}).textContent)
      .toBe('20/0.5/-30/-1')
    edit('얼굴 좌우 최소', '-10')
    await expect
      .poll(() => screen.getByRole('status', {name: '추적 범위'}).textContent)
      .toBe('20/0.5/-10/-1')
    edit('눈동자 좌우 최소', '-0.25')
    await expect
      .poll(() => screen.getByRole('status', {name: '추적 범위'}).textContent)
      .toBe('20/0.5/-10/-0.25')
    follow(reach / 2)
    await expect
      .poll(() => player!.getParameterValue('ParamAngleX'), {timeout: 3000})
      .toBeCloseTo(14.49785552, 6)
    expect(player.getParameterValue('ParamEyeBallX')).toBeCloseTo(0.362446388, 6)
    edit('최대 도달 거리', '0.5')
    await expect.poll(() => screen.getByRole('status', {name: '도달 거리'}).textContent).toBe('0.5')
    edit('얼굴 좌우 반응 배율', '0.5')
    await expect
      .poll(() => screen.getByRole('status', {name: '반응 배율'}).textContent)
      .toBe('0.5/1')
    edit('눈동자 좌우 반응 배율', '0.5')
    await expect
      .poll(() => screen.getByRole('status', {name: '반응 배율'}).textContent)
      .toBe('0.5/0.5')
    follow(reach / 2)
    await expect.poll(() => player!.getParameterValue('ParamAngleX'), {timeout: 3000}).toBe(20)
    expect(player.getParameterValue('ParamEyeBallX')).toBe(0.5)
    follow(-reach / 2)
    await expect.poll(() => player!.getParameterValue('ParamAngleX'), {timeout: 3000}).toBe(-10)
    expect(player.getParameterValue('ParamEyeBallX')).toBe(-0.25)
    follow(reach / 2)
    await expect.poll(() => player!.getParameterValue('ParamAngleX'), {timeout: 3000}).toBe(20)
    expect(player.getParameterValue('ParamEyeBallX')).toBe(0.5)
    const stored = (await repository.read()).widgets.find((entry) => entry.id === widget.id)
    expect(stored?.trackingOptions).toMatchObject({
      cursorReach: 0.5,
      eyeMaximumX: 0.5,
      eyeMinimumX: -0.25,
      eyeResponseX: 0.5,
      headMaximumX: 20,
      headMinimumX: -10,
      headResponseX: 0.5,
    })
    collecting = true
    await repository.configureSpeech(widget.id, {
      enabled: true,
      lipsync: {source: 'off'},
      x: 0.9,
      y: 0.05,
    })
    await expect.poll(() => screen.getByRole('status', {name: '음성 입력'}).textContent).toBe('off')
    await completed.promise
    expect(minimum).toBe(20)
    expect(loops).toBeGreaterThanOrEqual(2)
    expect(playerModule.createPlayer).toHaveBeenCalledOnce()
    expect(errors).not.toHaveBeenCalled()
  } finally {
    view.unmount()
    await repository.removeWidget(widget.id)
    repository.close()
  }
}, 40_000)
