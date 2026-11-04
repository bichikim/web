import {cleanup, fireEvent, render, screen} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, expect, it, vi} from 'vitest'
import {userEvent} from 'vitest/browser'
import {codexPort} from '../../src/features/codex/native'
import type {CodexActivity} from '../../src/features/codex'
import {SCodexSpeech} from '../../src/components/SCodexSpeech'
import 'virtual:uno.css'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

it.each(['Control', 'Meta'])(
  'should send from the speech bubble with %s+Enter and preserve plain Enter',
  async (modifier) => {
    const send = vi.spyOn(codexPort, 'sendPrompt').mockResolvedValue(undefined)
    render(() => (
      <div class="w-68">
        <SCodexSpeech
          activity={{
            notificationId: 1,
            phase: 'response',
            receivedAt: 1,
            response: '응답',
            sessionId: 'shortcut-chat',
            text: '응답 도착',
            tool: null,
          }}
        />
      </div>
    ))
    const input = screen.getByRole('textbox')
    await userEvent.type(input, 'first')
    await userEvent.keyboard('{Enter}')
    expect(input).toHaveValue('first\n')
    expect(send).not.toHaveBeenCalled()
    await userEvent.type(input, 'second')
    await userEvent.keyboard(`{${modifier}>}{Enter}{/${modifier}}`)
    expect(send).toHaveBeenCalledExactlyOnceWith('shortcut-chat', 'first\nsecond')
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
  },
)

it('should hide the composer through delivery and show it for failure or the next response', async () => {
  const accepted = Promise.withResolvers<void>()
  const failed = Promise.withResolvers<void>()
  const send = vi
    .spyOn(codexPort, 'sendPrompt')
    .mockReturnValueOnce(accepted.promise)
    .mockReturnValueOnce(failed.promise)
  const [activity, setActivity] = createSignal<CodexActivity>({
    notificationId: 1,
    phase: 'response',
    receivedAt: 1,
    response: '첫 응답',
    sessionId: 'chat',
    text: '응답 도착',
    tool: null,
  })
  render(() => (
    <div class="w-68">
      <SCodexSpeech activity={activity()} />
    </div>
  ))
  const bubble = screen.getByRole('status', {name: 'Codex 작업 알림'})
  const originalHeight = bubble.getBoundingClientRect().height
  fireEvent.input(screen.getByRole('textbox'), {target: {value: '다음 요청'}})
  fireEvent.click(screen.getByRole('button', {name: '보내기'}))
  expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
  expect(bubble.getBoundingClientRect().height).toBeLessThan(originalHeight)
  expect(screen.getByRole('region', {name: 'Codex 응답'})).toHaveTextContent('첫 응답')
  accepted.resolve()
  await accepted.promise
  setActivity((previous) => ({...previous, receivedAt: 2, title: '채팅 제목'}))
  expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
  setActivity((previous) => ({...previous, notificationId: 2, response: '새 응답'}))
  expect(screen.getByRole('textbox')).toHaveValue('')
  fireEvent.input(screen.getByRole('textbox'), {target: {value: '실패할 요청'}})
  fireEvent.click(screen.getByRole('button', {name: '보내기'}))
  expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
  failed.reject(new Error('offline'))
  await expect
    .poll(() => screen.queryByRole('alert')?.textContent)
    .toContain('전송하지 못했습니다.')
  expect(screen.getByRole('textbox')).toHaveValue('실패할 요청')
  expect(send).toHaveBeenCalledTimes(2)
})
