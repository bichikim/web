import {cleanup, render, screen} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, expect, test, vi} from 'vitest'
import * as playerModule from '@winter-love/puppet/player'
import {createLibraryRepository} from '@winter-love/wallpaper/settings/library-repository'
import {useWidget} from '../../src/features/poffo/use-widget'
import {usePuppet} from '../../src/features/background/use-puppet'
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
          if (loops >= 2 || minimum < 28) {
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
      <div class="h-120 w-100">
        <canvas ref={setCanvas} role="img" aria-label="시선 캐릭터" class="h-full w-full" />
        <output aria-label="음성 입력">{selected.lipsync()?.source}</output>
      </div>
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
    const depth = bounds.height * 0.3
    const follow = (horizontal: number, vertical = 0) =>
      globalThis.dispatchEvent(
        new PointerEvent('pointermove', {
          clientX: bounds.left + bounds.width / 2 + horizontal,
          clientY: bounds.top + bounds.height * 0.3 - vertical,
        }),
      )
    follow(depth / Math.sqrt(3))
    await expect
      .poll(() => player!.getParameterValue('ParamAngleX'), {timeout: 3000})
      .toBeCloseTo(10, 1)
    expect(player.getParameterValue('ParamEyeBallX')).toBeCloseTo(1 / 3, 2)
    follow(depth * Math.sqrt(3))
    await expect
      .poll(() => player!.getParameterValue('ParamAngleX'), {timeout: 3000})
      .toBeCloseTo(20, 1)
    expect(player.getParameterValue('ParamEyeBallX')).toBeCloseTo(2 / 3, 2)
    follow(-depth * Math.sqrt(3))
    await expect
      .poll(() => player!.getParameterValue('ParamAngleX'), {timeout: 3000})
      .toBeCloseTo(-20, 1)
    expect(player.getParameterValue('ParamEyeBallX')).toBeCloseTo(-2 / 3, 2)
    follow(0)
    await expect
      .poll(() => player!.getParameterValue('ParamAngleX'), {timeout: 3000})
      .toBeCloseTo(0, 1)
    follow(depth / Math.sqrt(6), depth / Math.sqrt(6))
    await expect
      .poll(() => player!.getParameterValue('ParamAngleX'), {timeout: 3000})
      .toBeCloseTo(Math.sqrt(50), 1)
    expect(player.getParameterValue('ParamAngleY')).toBeCloseTo(Math.sqrt(50), 1)
    follow(depth * 10)
    await expect
      .poll(() => player!.getParameterValue('ParamAngleX'), {timeout: 3000})
      .toBeGreaterThan(28)
    collecting = true
    await repository.configureSpeech(widget.id, {
      enabled: true,
      lipsync: {source: 'off'},
      x: 0.9,
      y: 0.05,
    })
    await expect.poll(() => screen.getByRole('status', {name: '음성 입력'}).textContent).toBe('off')
    await completed.promise
    expect(minimum).toBeGreaterThan(28)
    expect(loops).toBeGreaterThanOrEqual(2)
    expect(playerModule.createPlayer).toHaveBeenCalledOnce()
    expect(errors).not.toHaveBeenCalled()
  } finally {
    view.unmount()
    await repository.removeWidget(widget.id)
    repository.close()
  }
}, 30_000)
