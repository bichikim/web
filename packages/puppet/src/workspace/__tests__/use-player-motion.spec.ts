/** @vitest-environment jsdom */
import {createRoot, createSignal} from 'solid-js'
import {expect, test} from 'vitest'
import {createPlayerFixture} from '../../editor/__tests__/fixtures/player'
import {usePlayerMotion} from '../use-player-motion'

test('should retain playback when an editor temporarily omits the currently selected runtime motion', () => {
  const player = createPlayerFixture()
  const fixture = createRoot((dispose) => {
    const [motionId, select] = createSignal<string | undefined>('idle')
    usePlayerMotion({motionId, player: () => player})
    return {dispose, select}
  })
  expect(player.setMotion).toHaveBeenCalledExactlyOnceWith('idle')
  fixture.select(undefined)
  fixture.select('idle')
  expect(player.setMotion).toHaveBeenCalledTimes(1)
  fixture.select('tap')
  expect(player.setMotion).toHaveBeenLastCalledWith('tap')
  fixture.dispose()
})

test('should apply the selected motion once when the renderer replaces its player', () => {
  const first = createPlayerFixture()
  const second = createPlayerFixture()
  const fixture = createRoot((dispose) => {
    const [player, replace] = createSignal(first)
    usePlayerMotion({motionId: () => 'idle', player})
    return {dispose, replace}
  })
  fixture.replace(second)
  expect(first.setMotion).toHaveBeenCalledTimes(1)
  expect(second.setMotion).toHaveBeenCalledExactlyOnceWith('idle')
  fixture.dispose()
})
