/** @vitest-environment jsdom */
import {cleanup, fireEvent, render, screen} from '@solidjs/testing-library'
import {afterEach, expect, it, vi} from 'vitest'
import {createSignal} from 'solid-js'
import {SCodexSpeech} from '../SCodexSpeech'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})
it('should allow retrying speech independently of selecting or closing the bubble', () => {
  const retry = vi.fn()
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
      onVoiceRetry={retry}
      onSelect={select}
      onDismiss={dismiss}
      voiceNotice="무음 응답"
    />
  ))
  fireEvent.click(screen.getByRole('button', {name: '다시 읽기'}))
  expect(retry).toHaveBeenCalledOnce()
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
  expect(bubble.querySelector('span[aria-hidden="true"]')).toHaveAttribute('data-edge', 'bottom')
  expect(bubble.querySelector('span[aria-hidden="true"]')).toHaveStyle('--tail-x: 218px')
  setTarget({x: -92, y: 48})
  expect(bubble.querySelector('span[aria-hidden="true"]')).toHaveAttribute('data-edge', 'left')
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

it('should distinguish preparing speech from playback and hide the indicator when idle', () => {
  const [status, setStatus] = createSignal<
    'download' | 'generating' | 'playing' | 'buffering' | 'idle'
  >('download')
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
    />
  ))
  expect(screen.getByRole('img', {name: '음성 모델 준비 중'})).toHaveAttribute('aria-busy', 'true')
  expect(screen.getByRole('img').querySelectorAll('svg')).toHaveLength(2)
  setStatus('generating')
  expect(screen.getByRole('img', {name: '음성 생성 중'})).toHaveAttribute('aria-busy', 'true')
  setStatus('buffering')
  expect(screen.getByRole('img', {name: '말풍선 읽는 중 · 다음 음성 생성 중'})).toHaveAttribute(
    'aria-busy',
    'true',
  )
  setStatus('playing')
  expect(screen.getByRole('img', {name: '말풍선 읽는 중'})).toHaveAttribute('aria-busy', 'false')
  expect(screen.getByRole('img').querySelectorAll('svg')).toHaveLength(1)
  setStatus('idle')
  expect(screen.queryByRole('img')).not.toBeInTheDocument()
})
