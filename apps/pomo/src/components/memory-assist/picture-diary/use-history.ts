import {createSignal} from 'solid-js'
import type {PictureDiaryStroke} from '../../../features/picture-diary'

interface DrawingHistoryOptions {
  readonly strokes: ReadonlyArray<PictureDiaryStroke>
  readonly onChange?: (strokes: ReadonlyArray<PictureDiaryStroke>) => void
}

const MAXIMUM_HISTORY = 200

export const useDrawingHistory = (options: DrawingHistoryOptions) => {
  const [past, setPast] = createSignal<ReadonlyArray<ReadonlyArray<PictureDiaryStroke>>>([])
  const [future, setFuture] = createSignal<ReadonlyArray<ReadonlyArray<PictureDiaryStroke>>>([])
  const begin = () => {
    setPast((history) => [...history.slice(1 - MAXIMUM_HISTORY), options.strokes])
    setFuture([])
  }
  return {
    begin,
    canRedo: () => future().length > 0,
    canUndo: () => past().length > 0,
    clear: () => {
      begin()
      options.onChange?.([])
    },
    redo: () => {
      const next = future().at(-1)
      if (next === undefined) {
        return
      }
      setPast((history) => [...history, options.strokes])
      setFuture((history) => history.slice(0, -1))
      options.onChange?.(next)
    },
    reset: () => {
      const {strokes} = options
      setPast(strokes.map((_, index) => strokes.slice(0, index)))
      setFuture([])
    },
    undo: () => {
      const previous = past().at(-1)
      if (previous === undefined) {
        return
      }
      setFuture((history) => [...history, options.strokes])
      setPast((history) => history.slice(0, -1))
      options.onChange?.(previous)
    },
  }
}
