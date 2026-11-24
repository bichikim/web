/** @vitest-environment jsdom */
import {cleanup, fireEvent, render, screen} from '@solidjs/testing-library'
import {afterEach, expect, it, vi} from 'vitest'
import {createSignal} from 'solid-js'
import {SCodexSpeech} from '../SCodexSpeech'

vi.mock('../../features/speech/use-speech-minimum-height', () => ({
  useSpeechMinimumHeight: () => () => ({}),
}))

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})
it('should toggle speech independently of selecting or closing the bubble with one playback button', () => {
  const toggle = vi.fn()
  const select = vi.fn()
  const dismiss = vi.fn()
  render(() => (
    <SCodexSpeech
      activity={{
        notificationId: 1,
        phase: 'response',
        receivedAt: 1,
        sessionId: 'chat',
        text: '응답',
        tool: null,
      }}
      onVoiceToggle={toggle}
      onSelect={select}
      onDismiss={dismiss}
      voiceNotice="무음 응답"
    />
  ))
  fireEvent.click(screen.getByRole('button', {name: '음성 재생'}))
  expect(screen.queryByRole('button', {name: '다시 읽기'})).not.toBeInTheDocument()
  expect(toggle).toHaveBeenCalledOnce()
  expect(select).not.toHaveBeenCalled()
  expect(dismiss).not.toHaveBeenCalled()
})
it('should reorient its tail when the actual character target crosses to the other side', () => {
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue(
    new DOMRect(8, 8, 240, 100),
  )
  const [target, setTarget] = createSignal({x: 288, y: 228})
  render(() => (
    <SCodexSpeech
      target={target()}
      activity={{
        notificationId: 1,
        phase: 'working',
        receivedAt: 1,
        sessionId: 'chat',
        text: '작업 중',
        tool: null,
      }}
    />
  ))
  const bubble = screen.getByRole('status')
  const outline = bubble.querySelector('svg[data-edge]')
  expect(outline).toHaveAttribute('data-edge', 'bottom')
  expect(outline).toHaveAttribute('data-corner', 'bottom-right')
  const path = outline?.querySelector('path')
  const before = path?.getAttribute('d')
  setTarget({x: -92, y: 48})
  expect(outline).toHaveAttribute('data-edge', 'left')
  expect(path?.getAttribute('d')).not.toBe(before)
})
it('should show approval waiting without offering to approve outside Codex', () => {
  render(() => (
    <SCodexSpeech
      activity={{
        notificationId: 1,
        phase: 'approval',
        receivedAt: 1,
        sessionId: 'session',
        text: 'Codex에서 승인을 기다리고 있어요.',
        tool: null,
      }}
    />
  ))
  expect(screen.getByRole('status', {name: 'Codex 작업 알림'})).toHaveTextContent('승인 대기')
  expect(screen.queryByRole('button')).not.toBeInTheDocument()
})
it('should distinguish a response from completion of the entire task', () => {
  render(() => (
    <SCodexSpeech
      activity={{
        notificationId: 1,
        phase: 'response',
        receivedAt: 1,
        sessionId: 'session',
        text: 'Codex의 응답이 도착했어요.',
        tool: null,
      }}
    />
  ))
  expect(screen.getByRole('status')).toHaveTextContent('응답 도착')
  expect(screen.getByRole('status')).not.toHaveTextContent('작업 완료')
})

it('should render the actual response as text and close independently of selection', () => {
  const select = vi.fn()
  const dismiss = vi.fn()
  render(() => (
    <SCodexSpeech
      activity={{
        notificationId: 2,
        phase: 'response',
        receivedAt: 1,
        response: '<script>plain text</script>\n두 번째 줄',
        sessionId: 'internal-id',
        text: '응답 도착',
        title: '현재 폴더 이름 확인',
        tool: null,
      }}
      tone="teal"
      onSelect={select}
      onDismiss={dismiss}
    />
  ))
  expect(screen.getByRole('region', {name: '현재 폴더 이름 확인 응답'})).toHaveTextContent(
    '<script>plain text</script>',
  )
  expect(document.querySelector('script')).toBeNull()
  expect(screen.getByRole('status')).toHaveAttribute('data-tone', 'teal')
  expect(screen.getByRole('status')).not.toHaveTextContent('internal-id')
  fireEvent.click(screen.getByRole('button', {name: '현재 폴더 이름 확인 알림 닫기'}))
  expect(dismiss).toHaveBeenCalledOnce()
  expect(select).not.toHaveBeenCalled()
})

it('should show loading while preparing and retain one playback toggle across voice states', () => {
  const [status, setStatus] = createSignal<
    'download' | 'generating' | 'playing' | 'buffering' | 'paused' | 'idle'
  >('download')
  const toggle = vi.fn()
  render(() => (
    <SCodexSpeech
      activity={{
        notificationId: 1,
        phase: 'working',
        receivedAt: 1,
        sessionId: 'chat',
        text: '진행 중',
        tool: null,
      }}
      voiceState={status()}
      onVoiceToggle={toggle}
    />
  ))
  const button = screen.getByRole('button', {name: '음성 일시정지'})
  expect(button).toHaveAttribute('aria-busy', 'true')
  expect(button).toHaveAccessibleDescription('음성 준비 중')
  expect(button.querySelector('circle')).toHaveClass('animate-spin', 'motion-reduce:animate-none')
  expect(button.querySelectorAll('svg')).toHaveLength(1)
  fireEvent.click(button)
  expect(toggle).toHaveBeenCalledOnce()
  setStatus('generating')
  expect(button).toHaveAttribute('aria-busy', 'true')
  expect(button.querySelector('circle')).toBeInTheDocument()
  setStatus('buffering')
  expect(button).toHaveAttribute('aria-busy', 'true')
  expect(button.querySelector('circle')).toBeInTheDocument()
  setStatus('playing')
  expect(button).toHaveAttribute('aria-busy', 'false')
  expect(button.querySelector('circle')).toBeNull()
  expect(button).not.toHaveAttribute('aria-description')
  setStatus('paused')
  expect(screen.getByRole('button', {name: '음성 재생'})).toBe(button)
  setStatus('idle')
  expect(screen.getAllByRole('button', {name: '음성 재생'})).toEqual([button])
  expect(screen.queryByRole('button', {name: '음성 일시정지'})).not.toBeInTheDocument()
})

it('should open its chat by header double click or the open button while keeping other actions separate', async () => {
  const open = vi.fn()
  const select = vi.fn()
  const dismiss = vi.fn()
  render(() => (
    <SCodexSpeech
      activity={{
        notificationId: 1,
        phase: 'response',
        receivedAt: 1,
        sessionId: 'chat',
        text: '본문',
        tool: null,
      }}
      chatLabel="대화"
      onOpen={open}
      onSelect={select}
      onDismiss={dismiss}
    />
  ))
  const header = screen.getByRole('button', {name: '채팅 대화 선택'})
  fireEvent.click(header)
  expect(select).toHaveBeenCalledOnce()
  expect(open).not.toHaveBeenCalled()
  fireEvent.doubleClick(screen.getByText('본문'))
  expect(open).not.toHaveBeenCalled()
  fireEvent.doubleClick(header)
  await Promise.resolve()
  expect(open).toHaveBeenCalledExactlyOnceWith('chat')
  fireEvent.click(screen.getByRole('button', {name: '대화 Codex에서 열기'}))
  await Promise.resolve()
  expect(open).toHaveBeenCalledTimes(2)
  fireEvent.click(screen.getByRole('button', {name: '대화 알림 닫기'}))
  expect(open).toHaveBeenCalledTimes(2)
  expect(dismiss).toHaveBeenCalledOnce()
})

it('should report a failed chat opening once without retrying automatically', async () => {
  const open = vi.fn().mockRejectedValue(new Error('unavailable'))
  render(() => (
    <SCodexSpeech
      activity={{
        notificationId: 1,
        phase: 'working',
        receivedAt: 1,
        sessionId: 'chat',
        text: '본문',
        tool: null,
      }}
      onOpen={open}
    />
  ))
  fireEvent.click(screen.getByRole('button', {name: 'Codex Codex에서 열기'}))
  await Promise.resolve()
  expect(screen.getByRole('alert')).toHaveTextContent('Codex에서 대화를 열지 못했어요.')
  expect(open).toHaveBeenCalledOnce()
})
