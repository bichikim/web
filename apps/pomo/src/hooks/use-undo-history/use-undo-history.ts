import {batch, createSignal, untrack} from 'solid-js'
import type {UndoHistory, UseUndoHistoryProps} from './types'

/**
 * Records caller-owned immutable snapshots before explicit edits, without cloning or automatic tracking.
 * Undo and redo synchronously restore snapshots; reset only forgets history.
 */
export const useUndoHistory = <Value>(props: UseUndoHistoryProps<Value>): UndoHistory => {
  const DEFAULT_LIMIT = 200
  const limit = untrack(() => props.limit ?? DEFAULT_LIMIT)
  if (!Number.isInteger(limit) || limit < 1) {
    throw new RangeError('History limit must be a positive integer')
  }
  const [past, setPast] = createSignal<ReadonlyArray<Value>>([])
  const [future, setFuture] = createSignal<ReadonlyArray<Value>>([])

  return {
    canRedo: () => future().length > 0,
    canUndo: () => past().length > 0,
    capture: () => {
      const value = props.valueAccessor()
      batch(() => {
        setPast((history) => [...history, value].slice(-limit))
        setFuture([])
      })
    },
    redo: () => {
      const history = future()
      if (history.length === 0) {
        return
      }
      const value = props.valueAccessor()
      batch(() => {
        setPast((snapshots) => [...snapshots, value])
        setFuture(history.slice(0, -1))
        props.onChange(history[history.length - 1])
      })
    },
    reset: () => {
      batch(() => {
        setPast([])
        setFuture([])
      })
    },
    undo: () => {
      const history = past()
      if (history.length === 0) {
        return
      }
      const value = props.valueAccessor()
      batch(() => {
        setFuture((snapshots) => [...snapshots, value])
        setPast(history.slice(0, -1))
        props.onChange(history[history.length - 1])
      })
    },
  }
}
