import {expect, test} from 'vitest'
import {createPlayerFixture} from '../../__tests__/fixtures/player'
import {syncPlayerPlayback} from '../player-playback'

test('should resume the retained player without restarting the motion when the editor is playing', () => {
  const player = createPlayerFixture()
  expect(syncPlayerPlayback(player, true)).toBe(player)
  expect(player.resume).toHaveBeenCalledOnce()
  expect(player.play).not.toHaveBeenCalled()
  expect(player.seek).not.toHaveBeenCalled()
})

test('should pause the retained player when the editor is stopped and accept a released player', () => {
  const player = createPlayerFixture()
  expect(syncPlayerPlayback(player, false)).toBe(player)
  expect(player.pause).toHaveBeenCalledOnce()
  expect(syncPlayerPlayback(null, true)).toBeNull()
})
