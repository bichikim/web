/** @vitest-environment jsdom */
import {cleanup, fireEvent, render, screen} from '@solidjs/testing-library'
import {afterEach, expect, it, vi} from 'vitest'
import {SCodexPrompt} from '../SCodexPrompt'

afterEach(cleanup)
it('should present an accessible icon submit button without a separate text button row', () => {
  render(() => <SCodexPrompt sessionId="chat-one" />)
  const button = screen.getByRole('button', {name: '보내기'})
  expect(button.textContent?.trim()).toBe('')
  expect(button).toHaveAttribute('title', '보내기')
})
it('should queue a prompt only for its chat and prevent duplicate clicks', async () => {
  const send = vi.fn().mockResolvedValue(undefined)
  render(() => <SCodexPrompt sessionId="chat-one" onSend={send} />)
  expect(screen.getByRole('button', {name: '보내기'})).toBeDisabled()
  fireEvent.input(screen.getByRole('textbox'), {target: {value: '다음 요청'}})
  fireEvent.click(screen.getByRole('button', {name: '보내기'}))
  fireEvent.click(screen.getByRole('button', {name: '보내기'}))
  await Promise.resolve()
  expect(send).toHaveBeenCalledExactlyOnceWith('chat-one', '다음 요청')
  expect(screen.getByRole('textbox')).toHaveValue('')
})
it('should retain the prompt after a failed delivery without retrying automatically', async () => {
  const send = vi.fn().mockRejectedValue(new Error('offline'))
  render(() => <SCodexPrompt sessionId="chat-two" onSend={send} />)
  fireEvent.input(screen.getByRole('textbox'), {target: {value: '유지할 요청'}})
  fireEvent.click(screen.getByRole('button', {name: '보내기'}))
  await Promise.resolve()
  expect(screen.getByRole('alert')).toHaveTextContent('전송하지 못했습니다.')
  expect(screen.getByRole('textbox')).toHaveValue('유지할 요청')
  expect(send).toHaveBeenCalledExactlyOnceWith('chat-two', '유지할 요청')
})
