/** @vitest-environment jsdom */
import {fireEvent, render, waitFor} from '@solidjs/testing-library'
import {afterEach, expect, it, vi} from 'vitest'
import SWorkspace from '../SWorkspace'

const original = {height: 16, url: 'data:image/png;base64,original', width: 24}
const result = {height: 64, url: 'data:image/png;base64,result', width: 96}
afterEach(() => {
  delete window.__TAURI__
})

it('should require an image, keep Lanczos as default, and run and save the selected SPAN-F result', async () => {
  const invoke = vi
    .fn()
    .mockResolvedValueOnce(original)
    .mockResolvedValueOnce(result)
    .mockResolvedValueOnce(true)
  window.__TAURI__ = {core: {invoke}}
  const view = render(() => <SWorkspace />)
  expect(view.getByRole('radio', {name: /Lanczos/})).toBeChecked()
  expect(view.getByRole('button', {name: '4배 확대'})).toBeDisabled()
  expect(view.getByRole('button', {name: 'PNG 저장'})).toBeDisabled()
  fireEvent.click(view.getByRole('button', {name: '이미지 열기'}))
  await waitFor(() => expect(view.getByRole('img', {name: '원본'})).toBeDefined())
  fireEvent.click(view.getByRole('radio', {name: /SPAN-F/}))
  expect(invoke).toHaveBeenCalledTimes(1)
  fireEvent.click(view.getByRole('button', {name: '4배 확대'}))
  await waitFor(() =>
    expect(view.getByRole('img', {name: '4배 결과 · SPAN-F'})).toHaveAttribute('src', result.url),
  )
  expect(invoke).toHaveBeenNthCalledWith(2, 'upscale_image', {method: 'spanf'})
  fireEvent.click(view.getByRole('button', {name: 'PNG 저장'}))
  await waitFor(() => expect(view.getByRole('status')).toHaveTextContent('PNG를 저장했습니다.'))
  expect(invoke).toHaveBeenNthCalledWith(3, 'save_image', undefined)
})

it('should disable conflicting actions while processing and send a real cancel command', async () => {
  const pending = Promise.withResolvers<unknown>()
  const invoke = vi
    .fn()
    .mockResolvedValueOnce(original)
    .mockImplementationOnce(() => pending.promise)
    .mockResolvedValueOnce(undefined)
  window.__TAURI__ = {core: {invoke}}
  const view = render(() => <SWorkspace />)
  fireEvent.click(view.getByRole('button', {name: '이미지 열기'}))
  await waitFor(() => expect(view.getByRole('button', {name: '4배 확대'})).toBeEnabled())
  fireEvent.click(view.getByRole('button', {name: '4배 확대'}))
  expect(view.getByRole('button', {name: '이미지 열기'})).toBeDisabled()
  fireEvent.click(view.getByRole('button', {name: '확대 중지'}))
  expect(invoke).toHaveBeenNthCalledWith(3, 'cancel_upscale', undefined)
  pending.resolve(null)
  await waitFor(() => expect(view.queryByRole('button', {name: '확대 중지'})).toBeNull())
  expect(view.getByRole('button', {name: '이미지 열기'})).toBeEnabled()
  expect(view.getByRole('status')).toHaveTextContent('확대를 취소했습니다.')
})

it('should surface native capture errors and allow retry', async () => {
  const invoke = vi.fn().mockRejectedValue('capture_failed')
  window.__TAURI__ = {core: {invoke}}
  const view = render(() => <SWorkspace />)
  fireEvent.click(view.getByRole('button', {name: '＋ 영역 캡처'}))
  await waitFor(() => expect(view.getByRole('alert')).toHaveTextContent('화면 기록 권한'))
  expect(invoke).toHaveBeenCalledWith('capture_image', undefined)
  expect(view.getByRole('button', {name: '＋ 영역 캡처'})).toBeEnabled()
})
