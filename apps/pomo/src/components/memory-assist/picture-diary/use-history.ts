import {useUndoHistory} from 'src/hooks/use-undo-history'
import type {PictureDiaryStroke} from 'src/features/picture-diary'

interface UseDrawingHistoryProps {
  readonly strokes: ReadonlyArray<PictureDiaryStroke>
  readonly onChange?: (strokes: ReadonlyArray<PictureDiaryStroke>) => void
}

export const useDrawingHistory = (props: UseDrawingHistoryProps) => {
  const history = useUndoHistory({
    limit: 200,
    onChange: (strokes) => props.onChange?.(strokes),
    valueAccessor: () => props.strokes,
  })

  return {
    begin: history.capture,
    canRedo: history.canRedo,
    canUndo: history.canUndo,
    clear: () => {
      history.capture()
      props.onChange?.([])
    },
    redo: history.redo,
    reset: history.reset,
    undo: history.undo,
  }
}
