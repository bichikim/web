/** @vitest-environment jsdom */
import {cleanup, fireEvent, render, screen, within} from '@solidjs/testing-library'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'
import {codexPort} from '../../features/codex/native'
import type {CodexSnapshot} from '../../features/codex/types'
import {SCodexConnection} from '../SCodexConnection'

vi.mock('../../features/codex/native', () => ({
  codexPort: {
    available: true,
    configureQuestions: vi.fn(),
    connect: vi.fn(),
    disconnect: vi.fn(),
    read: vi.fn(),
    subscribe: vi.fn(),
  },
}))
vi.mock('@tauri-apps/api/core', () => ({invoke: vi.fn(async () => undefined), isTauri: () => true}))
vi.mock('../../features/voice/client', () => ({
  createVoiceClient: () => ({dispose: vi.fn(), play: vi.fn(), prepare: vi.fn()}),
}))
const initial: CodexSnapshot = {
  activity: null,
  approvalEnabled: true,
  questionsEnabled: false,
  received: true,
  recent: [],
  registered: true,
  sessions: [],
}
beforeEach(() => {
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
    configurable: true,
    value(this: HTMLDialogElement) {
      this.open = true
    },
  })
  Object.defineProperty(HTMLDialogElement.prototype, 'close', {
    configurable: true,
    value(this: HTMLDialogElement) {
      this.open = false
    },
  })
  vi.mocked(codexPort.subscribe).mockResolvedValue(() => undefined)
  vi.mocked(codexPort.read).mockResolvedValue(initial)
})
afterEach(() => {
  cleanup()
  Reflect.deleteProperty(HTMLDialogElement.prototype, 'showModal')
  Reflect.deleteProperty(HTMLDialogElement.prototype, 'close')
  vi.restoreAllMocks()
  vi.clearAllMocks()
})

it('should preserve the notification connection when question setup fails and allow retry', async () => {
  vi.mocked(codexPort.read).mockResolvedValue({...initial, registered: false})
  vi.mocked(codexPort.connect).mockResolvedValue(initial)
  vi.mocked(codexPort.configureQuestions!).mockRejectedValueOnce(new Error('write failed'))
  render(() => <SCodexConnection />)
  await vi.waitFor(() => expect(screen.getByRole('button', {name: 'Codex 연결'})).toBeEnabled())
  fireEvent.click(screen.getByRole('button', {name: 'Codex 연결'}))
  expect(await screen.findByRole('alert')).toHaveTextContent('연결을 확인')
  expect(screen.getByRole('group', {name: '작업·응답 수신'})).toHaveTextContent('연결됨')
  expect(screen.getByRole('button', {name: '질문 답변 연결'})).toBeEnabled()
  expect(codexPort.disconnect).not.toHaveBeenCalled()
})

it('should keep the card compact and open management without changing existing connections', async () => {
  render(() => <SCodexConnection />)
  fireEvent.click(await screen.findByRole('button', {name: 'Codex 관리'}))
  const dialog = screen.getByRole('dialog', {name: 'Codex 연결 관리'})
  expect(within(dialog).getByRole('group', {name: '작업·응답 수신'})).toHaveTextContent('연결됨')
  expect(within(dialog).getByRole('group', {name: '승인 요청 처리'})).toHaveTextContent('등록됨')
  expect(screen.getByRole('region', {name: 'AI 에이전트 연결'})).not.toContainElement(dialog)
  expect(codexPort.connect).not.toHaveBeenCalled()
  expect(codexPort.configureQuestions).not.toHaveBeenCalled()
  fireEvent.click(within(dialog).getByRole('button', {name: '닫기'}))
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  expect(screen.queryByText('수신 기록')).not.toBeInTheDocument()
})

it('should wait for the saved connection before allowing registration', async () => {
  const saved = Promise.withResolvers<CodexSnapshot>()
  vi.mocked(codexPort.read).mockReturnValue(saved.promise)
  render(() => <SCodexConnection />)
  expect(screen.getByRole('button', {name: 'Codex 연결'})).toBeDisabled()
  fireEvent.click(screen.getByRole('button', {name: 'Codex 연결'}))
  expect(codexPort.connect).not.toHaveBeenCalled()
  saved.resolve(initial)
  expect(await screen.findByRole('button', {name: 'Codex 관리'})).toBeEnabled()
})

it('should configure questions separately without disconnecting the agent', async () => {
  vi.mocked(codexPort.configureQuestions!)
    .mockResolvedValueOnce({...initial, questionsEnabled: true})
    .mockResolvedValueOnce(initial)
  render(() => <SCodexConnection />)
  fireEvent.click(await screen.findByRole('button', {name: 'Codex 관리'}))
  fireEvent.click(screen.getByRole('button', {name: '질문 답변 연결'}))
  await Promise.resolve()
  expect(codexPort.configureQuestions).toHaveBeenLastCalledWith(true)
  expect(screen.getByRole('group', {name: '질문 답변'})).toHaveTextContent('등록됨')
  fireEvent.click(screen.getByRole('button', {name: '질문 연결 해제'}))
  await Promise.resolve()
  expect(codexPort.configureQuestions).toHaveBeenLastCalledWith(false)
  expect(codexPort.disconnect).not.toHaveBeenCalled()
})

it('should guide one connection flow without claiming trust before receiving an event', async () => {
  const disconnected = {...initial, approvalEnabled: false, received: false, registered: false}
  vi.mocked(codexPort.read).mockResolvedValue(disconnected)
  vi.mocked(codexPort.connect).mockResolvedValue({...initial, received: false})
  vi.mocked(codexPort.configureQuestions!).mockResolvedValue({
    ...initial,
    questionsEnabled: true,
    received: false,
  })
  render(() => <SCodexConnection />)
  await vi.waitFor(() => expect(screen.getByRole('button', {name: 'Codex 연결'})).toBeEnabled())
  fireEvent.click(screen.getByRole('button', {name: 'Codex 연결'}))
  await vi.waitFor(() => expect(codexPort.configureQuestions).toHaveBeenCalledWith(true))
  expect(screen.getByRole('dialog')).toHaveTextContent('수신 대기')
  expect(screen.getByRole('dialog')).toHaveTextContent('검토·승인')
  expect(codexPort.connect).toHaveBeenCalledOnce()
})

it('should keep diagnostics out of the card and disconnect only through management', async () => {
  vi.mocked(codexPort.read).mockResolvedValue({
    ...initial,
    recent: [
      {
        emitted_at: 1,
        hook_event_name: 'PermissionRequest',
        session_id: 'chat',
        tool_name: 'Bash',
        turn_id: null,
      },
    ],
    sessions: [
      {
        notificationId: 1,
        phase: 'response',
        receivedAt: 1,
        sessionId: 'chat',
        text: '응답',
        title: '배치 확인',
        tool: null,
      },
    ],
  })
  vi.mocked(codexPort.disconnect).mockResolvedValue({
    ...initial,
    received: false,
    registered: false,
  })
  render(() => <SCodexConnection />)
  fireEvent.click(await screen.findByRole('button', {name: 'Codex 관리'}))
  fireEvent.click(screen.getByRole('button', {name: '연결 진단'}))
  expect(screen.getByRole('list', {name: 'Codex 알림 수신 기록'})).toHaveTextContent('Bash')
  expect(screen.getByRole('list', {name: '채팅별 마지막 알림'})).toHaveTextContent('배치 확인')
  fireEvent.click(screen.getByRole('button', {name: '연결 해제'}))
  await Promise.resolve()
  expect(codexPort.disconnect).toHaveBeenCalledOnce()
  await vi.waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  expect(screen.getByRole('button', {name: 'Codex 연결'})).toBeInTheDocument()
})
