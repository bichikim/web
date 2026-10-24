/** @vitest-environment jsdom */
import {fireEvent, render} from '@solidjs/testing-library'
import {expect, test, vi} from 'vitest'
import {TemporaryFormButton} from '../TemporaryFormButton'

test('should preview on hover and require two actions to discard', () => {
  const onPreview = vi.fn()
  const onRemove = vi.fn()
  const view = render(() => (
    <TemporaryFormButton
      selected={false}
      onPreview={onPreview}
      onRemove={onRemove}
      onSave={() => true}
    />
  ))
  fireEvent.mouseEnter(view.getByRole('button', {name: '임시 변경'}))
  expect(onPreview).toHaveBeenLastCalledWith(true)
  fireEvent.mouseLeave(view.getByRole('button', {name: '임시 변경'}))
  expect(onPreview).toHaveBeenLastCalledWith(false)
  fireEvent.click(view.getByRole('button', {name: '임시 변경 삭제'}))
  expect(onRemove).not.toHaveBeenCalled()
  fireEvent.click(view.getByRole('button', {name: '진짜 삭제?'}))
  expect(onRemove).toHaveBeenCalledOnce()
})
