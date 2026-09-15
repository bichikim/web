/** @vitest-environment jsdom */
import {createRenderEffect, createRoot, createSignal} from 'solid-js'
import {describe, expect, it} from 'vitest'
import {
  type ShuffleQueueFactory,
  usePlaybackOrder,
  type UsePlaybackOrderProps,
} from '../use-playback-order'

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

describe('manual navigation', () => {
  it('should retain previous-track history when a shuffled cycle restarts', () => {
    createRoot((dispose) => {
      const [index, setIndex] = createSignal(0)
      const order = createOrder({
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

  it('should keep manual sequential navigation inside the playlist when repeat is disabled', () => {
    createRoot((dispose) => {
      const [index, setIndex] = createSignal(0)
      let selections = 0
      const order = createOrder({
        currentIndex: index,
        initialQueue: [1],
        onRestart: () => undefined,
        onSelect: (selection) => {
          selections += 1
          setIndex(selection.index)
        },
        onStop: () => undefined,
        trackCount: () => 2,
      })
      order.toggleRepeatMode('repeat-all')
      order.toggleShuffle()
      order.selectNextTrack()
      expect(index()).toBe(1)
      order.selectPreviousTrack()
      expect(index()).toBe(0)
      expect(selections).toBe(2)
      dispose()
    })
  })

  it('should normalize manual sequential navigation before selection', () => {
    createRoot((dispose) => {
      const [index, setIndex] = createSignal(0)
      const selections: number[] = []
      const order = createOrder({
        currentIndex: index,
        initialQueue: [1],
        onRestart: () => undefined,
        onSelect: (selection) => {
          selections.push(selection.index)
          setIndex(selection.index)
        },
        onStop: () => undefined,
        trackCount: () => 2,
      })
      order.toggleShuffle()
      order.selectPreviousTrack()
      expect(index()).toBe(1)
      order.selectNextTrack()
      expect(index()).toBe(0)
      expect(selections).toEqual([1, 0])
      dispose()
    })
  })

  it('should reconcile the shuffle queue after sequential previous navigation', () => {
    createRoot((dispose) => {
      const [index, setIndex] = createSignal(0)
      const selections: number[] = []
      const order = createOrder({
        currentIndex: index,
        initialQueue: [1],
        onRestart: () => undefined,
        onSelect: (selection) => {
          selections.push(selection.index)
          setIndex(selection.index)
        },
        onStop: () => undefined,
        trackCount: () => 2,
      })
      order.selectPreviousTrack()
      order.selectNextTrack()
      expect(index()).toBe(0)
      expect(selections).toEqual([1, 0])
      dispose()
    })
  })

  it('should refresh navigation availability after reselecting the current track', async () => {
    await new Promise<void>((resolve) => {
      createRoot((dispose) => {
        const [index, setIndex] = createSignal(0)
        const order = createOrder({
          currentIndex: index,
          initialQueue: [1, 0],
          onRestart: () => undefined,
          onSelect: (selection) => setIndex(selection.index),
          onStop: () => undefined,
          trackCount: () => 3,
        })
        let canNavigatePrevious = false
        createRenderEffect(() => {
          canNavigatePrevious = order.canNavigatePreviousTrack()
        })

        order.toggleRepeatMode('repeat-all')
        order.selectNextTrack()
        order.selectNextTrack()
        expect(index()).toBe(0)
        expect(canNavigatePrevious).toBe(true)

        order.selectChosenTrack(0)
        expect(order.canNavigatePreviousTrack()).toBe(false)
        queueMicrotask(() => {
          expect(canNavigatePrevious).toBe(false)
          dispose()
          resolve()
        })
      })
    })
  })

  it('should use replacement callbacks for manual track selection', () => {
    createRoot((dispose) => {
      const [index, setIndex] = createSignal(0)
      const initialSelections: number[] = []
      const replacementSelections: number[] = []
      const navigationProps = {
        currentIndex: index,
        initialQueue: [1],
        onRestart: () => undefined,
        onSelect: (selection: {readonly index: number}) => {
          initialSelections.push(selection.index)
          setIndex(selection.index)
        },
        onStop: () => undefined,
        trackCount: () => 2,
      } satisfies TestPlaybackOrderProps
      const order = createOrder(navigationProps)

      order.toggleShuffle()
      navigationProps.onSelect = (selection) => {
        replacementSelections.push(selection.index)
        setIndex(selection.index)
      }
      order.selectNextTrack()
      order.selectPreviousTrack()

      expect(initialSelections).toEqual([])
      expect(replacementSelections).toEqual([1, 0])
      dispose()
    })
  })

  it('should use a replacement restart callback for a single-track navigation', () => {
    createRoot((dispose) => {
      let initialRestarts = 0
      let replacementRestarts = 0
      const navigationProps = {
        currentIndex: () => 0,
        initialQueue: [],
        onRestart: () => {
          initialRestarts += 1
        },
        onSelect: () => undefined,
        onStop: () => undefined,
        trackCount: () => 1,
      } satisfies TestPlaybackOrderProps
      const order = createOrder(navigationProps)

      navigationProps.onRestart = () => {
        replacementRestarts += 1
      }
      order.selectNextTrack()

      expect(initialRestarts).toBe(0)
      expect(replacementRestarts).toBe(1)
      dispose()
    })
  })

  it('should not wrap sequential navigation after a repeat-disabled ending', () => {
    createRoot((dispose) => {
      const [index, setIndex] = createSignal(0)
      let selections = 0
      let restarts = 0
      let stops = 0
      const order = createOrder({
        currentIndex: index,
        initialQueue: [1],
        onRestart: () => {
          restarts += 1
        },
        onSelect: (selection) => {
          selections += 1
          setIndex(selection.index)
        },
        onStop: () => {
          stops += 1
        },
        trackCount: () => 2,
      })
      order.toggleRepeatMode('repeat-all')
      order.toggleShuffle()
      order.selectChosenTrack(1)
      order.handleEnded()
      expect(stops).toBe(1)
      expect(restarts).toBe(0)
      expect(selections).toBe(1)
      order.selectNextTrack()
      expect(index()).toBe(1)
      expect(stops).toBe(1)
      expect(restarts).toBe(0)
      expect(selections).toBe(1)
      dispose()
    })
  })

  it('should not wrap previous navigation from the first track when repeat is disabled', () => {
    createRoot((dispose) => {
      const [index, setIndex] = createSignal(0)
      let selections = 0
      let restarts = 0
      let stops = 0
      const order = createOrder({
        currentIndex: index,
        initialQueue: [1],
        onRestart: () => {
          restarts += 1
        },
        onSelect: (selection) => {
          selections += 1
          setIndex(selection.index)
        },
        onStop: () => {
          stops += 1
        },
        trackCount: () => 2,
      })
      order.toggleRepeatMode('repeat-all')
      order.selectPreviousTrack()
      expect(index()).toBe(0)
      expect(selections).toBe(0)
      expect(restarts).toBe(0)
      expect(stops).toBe(0)
      dispose()
    })
  })

  it('should consume a deterministic multi-track shuffle cycle before stopping when repeat is disabled', () => {
    createRoot((dispose) => {
      const [index, setIndex] = createSignal(0)
      const selections: Array<{index: number; shouldResume?: boolean}> = []
      let restarts = 0
      let stops = 0
      const order = createOrder({
        currentIndex: index,
        initialQueue: [2, 1],
        onRestart: () => {
          restarts += 1
        },
        onSelect: (selection) => {
          selections.push(selection)
          setIndex(selection.index)
        },
        onStop: () => {
          stops += 1
        },
        trackCount: () => 3,
      })
      order.toggleRepeatMode('repeat-all')
      order.selectNextTrack()
      expect(index()).toBe(2)
      expect(selections[0]?.shouldResume).toBeUndefined()
      order.selectNextTrack()
      expect(index()).toBe(1)
      expect(selections[1]?.shouldResume).toBeUndefined()
      order.selectPreviousTrack()
      expect(index()).toBe(2)
      expect(selections[2]?.shouldResume).toBeUndefined()
      order.selectPreviousTrack()
      expect(index()).toBe(0)
      expect(selections[3]?.shouldResume).toBeUndefined()
      order.selectNextTrack()
      expect(index()).toBe(2)
      expect(selections[4]?.shouldResume).toBeUndefined()
      order.selectNextTrack()
      expect(index()).toBe(1)
      expect(selections[5]?.shouldResume).toBeUndefined()
      order.handleEnded()
      expect(stops).toBe(1)
      expect(restarts).toBe(0)
      expect(selections).toHaveLength(6)
      order.selectNextTrack()
      expect(index()).toBe(1)
      expect(stops).toBe(1)
      expect(restarts).toBe(0)
      expect(selections).toHaveLength(6)
      dispose()
    })
  })

  it('should not restart a single track when repeat is disabled', () => {
    createRoot((dispose) => {
      const [index, setIndex] = createSignal(0)
      let restarts = 0
      let selections = 0
      let stops = 0
      const order = createOrder({
        currentIndex: index,
        initialQueue: [],
        onRestart: () => {
          restarts += 1
        },
        onSelect: (selection) => {
          selections += 1
          setIndex(selection.index)
        },
        onStop: () => {
          stops += 1
        },
        trackCount: () => 1,
      })
      order.toggleRepeatMode('repeat-all')
      order.handleEnded()
      expect(stops).toBe(1)
      order.selectNextTrack()
      order.selectPreviousTrack()
      expect(index()).toBe(0)
      expect(restarts).toBe(0)
      expect(selections).toBe(0)
      expect(stops).toBe(1)
      dispose()
    })
  })

  it('should use the injected shuffle queue factory when a manual cycle resets', () => {
    createRoot((dispose) => {
      const [index, setIndex] = createSignal(2)
      const factoryCalls: Array<{currentIndex: number; trackCount: number}> = []
      const order = createOrder(
        {
          currentIndex: index,
          initialQueue: [],
          onRestart: () => undefined,
          onSelect: (selection) => setIndex(selection.index),
          onStop: () => undefined,
          trackCount: () => 3,
        },
        (options) => {
          factoryCalls.push(options)
          return [0, 1]
        },
      )

      order.selectNextTrack()

      expect(factoryCalls).toEqual([{currentIndex: 2, trackCount: 3}])
      expect(index()).toBe(0)
      dispose()
    })
  })
})

describe('ended playback', () => {
  it('should request resume when natural ending selects the next track', () => {
    createRoot((dispose) => {
      const [index, setIndex] = createSignal(0)
      const selections: Array<{index: number; shouldResume?: boolean}> = []
      const order = createOrder({
        currentIndex: index,
        initialQueue: [1],
        onRestart: () => undefined,
        onSelect: (selection) => {
          selections.push(selection)
          setIndex(selection.index)
        },
        onStop: () => undefined,
        trackCount: () => 2,
      })
      order.toggleShuffle()
      order.handleEnded()
      expect(index()).toBe(1)
      expect(selections).toEqual([{index: 1, shouldResume: true}])
      dispose()
    })
  })

  it('should request resume for each natural shuffled selection', () => {
    createRoot((dispose) => {
      const [index, setIndex] = createSignal(0)
      const selections: Array<{index: number; shouldResume?: boolean}> = []
      const order = createOrder({
        currentIndex: index,
        initialQueue: [1],
        onRestart: () => undefined,
        onSelect: (selection) => {
          selections.push(selection)
          setIndex(selection.index)
        },
        onStop: () => undefined,
        trackCount: () => 2,
      })
      order.handleEnded()
      order.handleEnded()
      expect(selections).toEqual([
        {index: 1, shouldResume: true},
        {index: 0, shouldResume: true},
      ])
      dispose()
    })
  })

  it('should use one snapshot while completing a natural shuffled selection', () => {
    createRoot((dispose) => {
      let currentIndexReads = 0
      const selections: Array<{index: number; shouldResume?: boolean}> = []
      const order = createOrder({
        currentIndex: () => {
          currentIndexReads += 1
          return currentIndexReads === 1 ? 0 : 1
        },
        initialQueue: [1],
        onRestart: () => undefined,
        onSelect: (selection) => selections.push(selection),
        onStop: () => undefined,
        trackCount: () => 2,
      })
      order.handleEnded()
      order.selectPreviousTrack()
      expect(selections).toEqual([{index: 1, shouldResume: true}, {index: 0}])
      dispose()
    })
  })

  it('should request resume when natural sequential ending wraps to the first track', () => {
    createRoot((dispose) => {
      const [index, setIndex] = createSignal(1)
      const selections: Array<{index: number; shouldResume?: boolean}> = []
      const order = createOrder({
        currentIndex: index,
        initialQueue: [0],
        onRestart: () => undefined,
        onSelect: (selection) => {
          selections.push(selection)
          setIndex(selection.index)
        },
        onStop: () => undefined,
        trackCount: () => 2,
      })
      order.toggleShuffle()
      order.handleEnded()
      expect(selections).toEqual([{index: 0, shouldResume: true}])
      dispose()
    })
  })

  it('should reset history after queue replacement and support repeat-one and stopped endings', () => {
    createRoot((dispose) => {
      const [index, setIndex] = createSignal(0)
      let restarts = 0
      let stops = 0
      const order = createOrder({
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
})
