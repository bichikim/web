/** @vitest-environment jsdom */
import {createRoot, createSignal} from 'solid-js'
import {describe, expect, it} from 'vitest'
import {
  type ShuffleQueueFactory,
  usePlaybackOrder,
  type UsePlaybackOrderProps,
} from '../components/media-player/use-playback-order'

type TestPlaybackOrderProps = Omit<UsePlaybackOrderProps, 'createShuffleQueue'>

const createTestShuffleQueue: ShuffleQueueFactory = ({currentIndex, trackCount}) =>
  Array.from({length: trackCount}, (_value, index) => index).filter(
    (index) => index !== currentIndex,
  )

const createOrder = (
  props: TestPlaybackOrderProps,
  createShuffleQueue: ShuffleQueueFactory = createTestShuffleQueue,
) =>
  usePlaybackOrder({
    ...props,
    createShuffleQueue,
    onRestart: () => props.onRestart(),
    onSelect: (options) => props.onSelect(options),
    onStop: () => props.onStop(),
  })

/**
 * Controlled playlist shrink (props.tracks length change) does not call resetOrder(),
 * so stale shuffle queue indices wrap via normalizeTrackIndex and replay removed tracks.
 *
 * @see apps/pomo/src/components/media-player/use-player-controller.ts L254-269
 */
describe('bug-hunt: shuffle stale indices after controlled track shrink', () => {
  it('should play the next surviving track when shrink happens before consuming stale queue head', () => {
    createRoot((dispose) => {
      const [index, setIndex] = createSignal(0)
      const [trackCount, setTrackCount] = createSignal(4)
      const selections: number[] = []
      const order = createOrder({
        currentIndex: index,
        initialQueue: [2, 3, 1],
        onRestart: () => undefined,
        onSelect: (selection) => {
          selections.push(selection.index)
          setIndex(selection.index)
        },
        onStop: () => undefined,
        trackCount,
      })

      setTrackCount(2)
      order.selectNextTrack()

      expect(index()).toBe(1)
      expect(selections).toEqual([1])
      dispose()
    })
  })
})
