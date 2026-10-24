import {cleanup, fireEvent, render, screen} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, expect, it, vi} from 'vitest'
import * as playerModule from '@winter-love/puppet/player'
import {SPoffoMotionSettings} from '../../src/components/SPoffoMotionSettings'
import {SPuppetBackground} from '../../src/components/SPuppetBackground'
import {SAMPLE_PUPPET_ID} from '../../src/features/background/constants'
import 'virtual:uno.css'

vi.mock('@winter-love/puppet/player', {spy: true})
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})
it('should apply model motion changes and stop them on the same real player', async () => {
  const [motionId, setMotionId] = createSignal<string | null | undefined>()
  const [motions, setMotions] = createSignal<readonly string[]>([])
  const error = vi.fn()
  render(() => (
    <div class="grid w-80 gap-3">
      <SPoffoMotionSettings motions={motions()} value={motionId()} onChange={setMotionId} />
      <div class="h-60 w-80">
        <SPuppetBackground
          assetId={() => SAMPLE_PUPPET_ID}
          load={vi.fn()}
          onError={error}
          motionId={motionId}
          onMotions={setMotions}
        />
      </div>
    </div>
  ))
  await expect.poll(() => motions()).toContain('blink')
  const player = await vi.mocked(playerModule.createPlayer).mock.results[0]!.value
  const select = screen.getByRole('combobox', {name: '기본 애니메이션'})
  fireEvent.click(select)
  fireEvent.click(screen.getByRole('option', {name: 'blink'}))
  player.pause()
  player.seek(0.2)
  expect(player.getParameterValue('angle-x')).toBe(30)
  fireEvent.click(select)
  fireEvent.click(screen.getByRole('option', {name: '재생 안 함'}))
  expect(player.getParameterValue('angle-x')).toBe(0)
  fireEvent.click(select)
  fireEvent.click(screen.getByRole('option', {name: '자동 · idle-deform'}))
  player.pause()
  player.seek(1)
  expect(player.getParameterValue('angle-y')).toBe(-30)
  expect(playerModule.createPlayer).toHaveBeenCalledOnce()
  expect(error).not.toHaveBeenCalled()
})
