/** @vitest-environment node */
import {createRoot} from 'solid-js'
import {expect, it, vi} from 'vitest'
import type {PictureDiaryStroke} from '../features/picture-diary'
import {useDrawingHistory} from '../components/memory-assist/picture-diary/use-history'

it('should not emit an empty stroke list when undo runs immediately after reset', () => {
  const strokes: ReadonlyArray<PictureDiaryStroke> = [{points: [{x: 0.5, y: 0.5}]}]
  const onChange = vi.fn()

  createRoot((dispose) => {
    const history = useDrawingHistory({onChange, strokes})
    history.reset()
    history.undo()
    dispose()
  })

  expect(onChange).not.toHaveBeenCalled()
})
