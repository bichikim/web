import {cleanup, render, screen} from '@solidjs/testing-library'
import {afterEach, expect, test, vi} from 'vitest'
import * as playerModule from '@winter-love/puppet/player'
import {SPoffoWidgetCharacter} from '../../src/components/SPoffoWidgetCharacter'
import 'virtual:uno.css'

vi.mock('@winter-love/puppet/player', async (importOriginal) => {
  const module = await importOriginal<typeof playerModule>()
  return {...module, createPlayer: vi.fn(module.createPlayer)}
})
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

test('should keep the widget invisible until its configured first frame replaces the loading silhouette', async () => {
  const asset = Promise.withResolvers<string>()
  const frames: string[] = []
  const create = await vi.importActual<typeof playerModule>('@winter-love/puppet/player')
  vi.mocked(playerModule.createPlayer).mockImplementation((options) =>
    create.createPlayer({
      ...options,
      onAfterRender: () => {
        if (options.canvas.getAttribute('aria-hidden') === 'true') {
          frames.push(getComputedStyle(options.canvas).visibility)
        }
        options.onAfterRender?.()
      },
    }),
  )
  const errors = vi.fn()
  render(() => (
    <div class="relative h-100 w-80 bg-stone-800">
      <SPoffoWidgetCharacter
        assetId={() => 'builtin:ash'}
        interactive={() => false}
        load={() => asset.promise}
        motionId={() => null}
        onError={errors}
        tracking={() => 'off'}
        trackingOptions={() => ({headCenterX: 9})}
      />
    </div>
  ))
  const canvas = screen.getByLabelText('Poffo 배경') as HTMLCanvasElement
  const loading = screen.getByRole('status', {name: '캐릭터 불러오는 중'})
  expect(getComputedStyle(canvas).visibility).toBe('hidden')
  expect(loading.getBoundingClientRect().height).toBe(400)
  const mask = loading.querySelector<HTMLElement>('[aria-hidden="true"]')!
  expect(getComputedStyle(mask).maskImage.startsWith('url("data:image/webp')).toBe(true)
  const source = playerModule.createDemoDocument()
  asset.resolve(JSON.stringify(source))
  await expect.poll(() => screen.queryByRole('status')).toBeNull()
  expect(getComputedStyle(canvas).visibility).toBe('visible')
  const player = await vi.mocked(playerModule.createPlayer).mock.results[0]!.value
  expect(player.getParameterValue('angle-x')).toBe(9)
  expect(frames.length).toBeGreaterThan(0)
  expect(frames.every((visibility) => visibility === 'hidden')).toBe(true)
  expect(errors).not.toHaveBeenCalled()
}, 15_000)
