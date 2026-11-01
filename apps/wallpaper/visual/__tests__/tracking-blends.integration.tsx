import {cleanup, fireEvent, render, screen} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, expect, test} from 'vitest'
import {
  createPlayer,
  type Player,
  preparePuppetDocument,
  PUPPET_DOCUMENT_FORMAT,
  PUPPET_DOCUMENT_VERSION,
  type PuppetDocument,
} from '@winter-love/puppet/player'
import type {PoffoTrackingBindings} from '@winter-love/wallpaper/settings/tracking'
import {SPoffoTrackingBindings} from '../../src/components/SPoffoTrackingBindings'
import {useTracking} from '../../src/features/tracking/use-tracking'
import 'virtual:uno.css'

afterEach(cleanup)

const model: PuppetDocument = {
  format: PUPPET_DOCUMENT_FORMAT,
  motions: [
    {
      duration: 1,
      id: 'idle',
      tracks: [
        {
          keyframes: [
            {time: 0, value: 2},
            {time: 0.5, value: 3},
            {time: 1, value: 2},
          ],
          kind: 'parameter',
          parameterId: 'face-x',
        },
        {
          keyframes: [
            {time: 0, value: 0.2},
            {time: 0.5, value: 0.4},
            {time: 1, value: 0.2},
          ],
          kind: 'parameter',
          parameterId: 'gaze-x',
        },
      ],
    },
  ],
  parameters: [
    {defaultValue: 0, id: 'face-x', maximum: 30, minimum: -30, name: 'Head X'},
    {defaultValue: 0, id: 'gaze-x', maximum: 1, minimum: -1, name: 'Eye X'},
  ],
  parts: [],
  version: PUPPET_DOCUMENT_VERSION,
  viewport: {height: 480, width: 400},
}

test('should combine selected inputs with animation without accumulation and release on disconnect', async () => {
  const [bindings, setBindings] = createSignal<PoffoTrackingBindings>({})
  const [active, setActive] = createSignal<Player | null>(null)
  const [canvas, setCanvas] = createSignal<HTMLCanvasElement | null>(null)
  const errors: unknown[] = []
  const view = render(() => {
    useTracking({
      bindings,
      canvas,
      mode: () => 'cursor',
      onError: (cause) => errors.push(cause),
      options: () => ({eyeResponseX: 0.9, headResponseX: 1}),
      parameters: () => model.parameters!,
      player: active,
    })
    return (
      <div class="w-140 p-4">
        <SPoffoTrackingBindings
          assetId={null}
          disclosure={false}
          load={async () => ''}
          source={{error: () => null, loading: () => false, parameters: () => model.parameters!}}
          value={bindings()}
          onChange={setBindings}
        />
        <div class="h-120 w-100">
          <canvas ref={setCanvas} class="h-full w-full" />
        </div>
      </div>
    )
  })
  const prepared = await preparePuppetDocument({document: model})
  if (!prepared.ok) {
    throw new Error('Expected the tracking model to be valid')
  }
  const player = await createPlayer({canvas: canvas()!, document: prepared.document})
  player.playMotion('idle', {loop: true})
  player.pause()
  player.seek(0)
  setActive(player)
  const follow = () => {
    const bounds = canvas()!.getBoundingClientRect()
    globalThis.dispatchEvent(
      new PointerEvent('pointermove', {
        clientX: bounds.left + bounds.width / 2 + (bounds.height * 0.3) / Math.sqrt(3),
        clientY: bounds.top + bounds.height * 0.3,
      }),
    )
  }
  try {
    follow()
    await expect.poll(() => player.getParameterValue('face-x')).toBeCloseTo(10, 1)
    expect(player.getParameterValue('gaze-x')).toBeCloseTo(0.3, 1)
    fireEvent.click(screen.getByRole('combobox', {name: '얼굴 좌우 적용 방식'}))
    fireEvent.click(screen.getByRole('option', {name: '더하기'}))
    follow()
    await expect.poll(() => player.getParameterValue('face-x')).toBeCloseTo(12, 1)
    expect(player.getParameterValue('gaze-x')).toBeCloseTo(0.3, 1)
    fireEvent.click(screen.getByRole('combobox', {name: '눈동자 좌우 적용 방식'}))
    fireEvent.click(screen.getByRole('option', {name: '더하기'}))
    follow()
    await expect.poll(() => player.getParameterValue('face-x')).toBeCloseTo(12, 1)
    expect(player.getParameterValue('gaze-x')).toBeCloseTo(0.5, 2)
    for (let index = 0; index < 10; index += 1) {
      player.seek(0.5)
      expect(player.getParameterValue('face-x')).toBeCloseTo(13, 1)
      expect(player.getParameterValue('gaze-x')).toBeCloseTo(0.7, 2)
    }
    player.setParameterValue('face-x', 29)
    expect(player.getParameterValue('face-x')).toBe(30)
    player.clearParameterValues(['face-x'])
    view.unmount()
    expect(player.getParameterValue('face-x')).toBe(3)
    expect(player.getParameterValue('gaze-x')).toBe(0.4)
    expect(errors).toEqual([])
  } finally {
    view.unmount()
    player.destroy()
  }
}, 10_000)
