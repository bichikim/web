/** @vitest-environment jsdom */
import {createRoot, createSignal} from 'solid-js'
import {expect, it} from 'vitest'
import {usePlaybackOrder} from '../use-playback-order'

it('should retain previous-track history when a shuffled cycle restarts', () => {
  createRoot((dispose) => {
    const [index, setIndex] = createSignal(0)
    const order = usePlaybackOrder({
      currentIndex: index,
      initialQueue: [1],
      onRestart: () => undefined,
      onSelect: (selection) => setIndex(selection.index),
      onStop: () => undefined,
      trackCount: () => 2,
    })
    order.selectNextTrack()
    expect(index()).toBe(1)
    order.selectNextTrack()
    expect(index()).toBe(0)
    order.selectPreviousTrack()
    expect(index()).toBe(1)
    order.selectPreviousTrack()
    expect(index()).toBe(0)
    dispose()
  })
})

it('should reset history after queue replacement and support repeat-one and stopped endings', () => {
  createRoot((dispose) => {
    const [index, setIndex] = createSignal(0)
    let restarts = 0
    let stops = 0
    const order = usePlaybackOrder({
      currentIndex: index,
      initialQueue: [1],
      onRestart: () => {
        restarts += 1
      },
      onSelect: (selection) => setIndex(selection.index),
      onStop: () => {
        stops += 1
      },
      trackCount: () => 2,
    })
    order.selectNextTrack()
    order.resetOrder()
    order.selectPreviousTrack()
    expect(index()).toBe(0)
    order.toggleRepeatMode('repeat-one')
    order.handleEnded()
    expect(restarts).toBe(1)
    order.toggleRepeatMode('repeat-one')
    order.clearShuffleQueue()
    order.handleEnded()
    expect(stops).toBe(1)
    dispose()
  })
})
