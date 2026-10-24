/** @vitest-environment jsdom */
import {fireEvent, render, screen} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {expect, test, vi} from 'vitest'
import {FileLoadingDialog} from '../FileLoadingDialog'

test('should announce the selected file and let the user cancel loading', () => {
  const onCancel = vi.fn()
  render(() => <FileLoadingDialog fileName="ren.json" onCancel={onCancel} />)
  expect(screen.getByRole('dialog', {name: '불러오는 중…'})).toBeVisible()
  expect(screen.getByRole('status')).toHaveTextContent('불러오는 중…')
  expect(screen.getByText('ren.json')).toBeVisible()
  fireEvent.click(screen.getByRole('button', {name: '취소'}))
  expect(onCancel).toHaveBeenCalledOnce()
})

test('should close after the pending file finishes', () => {
  const [fileName, setFileName] = createSignal<string | null>('ren.json')
  render(() => <FileLoadingDialog fileName={fileName()} onCancel={vi.fn()} />)
  setFileName(null)
  expect(screen.getByRole('dialog')).toHaveAttribute('data-closed')
})
