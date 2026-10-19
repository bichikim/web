import {cleanup, fireEvent, render, screen} from '@solidjs/testing-library'
import {afterEach, expect, it, vi} from 'vitest'
import {codexPort} from '../../src/features/codex/native'
import {SCodexConnection} from '../../src/components/SCodexConnection'
import 'virtual:uno.css'

vi.mock('../../src/features/codex/native', () => ({
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
vi.mock('../../src/features/voice/client', () => ({
  createVoiceClient: () => ({dispose: vi.fn(), play: vi.fn(), prepare: vi.fn()}),
}))
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

it('should place management in the top layer with bounded scrolling and restore focus on close', async () => {
  vi.mocked(codexPort.subscribe).mockResolvedValue(() => undefined)
  vi.mocked(codexPort.read).mockResolvedValue({
    activity: null,
    approvalEnabled: true,
    questionsEnabled: true,
    received: true,
    recent: Array.from({length: 40}, (_, index) => ({
      emitted_at: index,
      hook_event_name: 'PreToolUse',
      session_id: 'chat',
      tool_name: 'Bash',
      turn_id: null,
    })),
    registered: true,
    sessions: [],
  })
  render(() => (
    <div class="h-24 w-100 overflow-hidden">
      <SCodexConnection />
    </div>
  ))
  const trigger = await screen.findByRole('button', {name: 'Codex 관리'})
  const card = screen.getByRole('region', {name: 'AI 에이전트 연결'})
  expect(card.getBoundingClientRect().height).toBeLessThan(100)
  trigger.focus()
  fireEvent.click(trigger)
  const dialog = screen.getByRole('dialog', {name: 'Codex 연결 관리'})
  expect(dialog.matches(':modal')).toBe(true)
  expect(dialog.contains(document.activeElement)).toBe(true)
  expect(getComputedStyle(dialog).zIndex).toBe('auto')
  fireEvent.click(screen.getByRole('button', {name: '연결 진단'}))
  const bounds = dialog.getBoundingClientRect()
  expect(bounds.top).toBeGreaterThanOrEqual(0)
  expect(bounds.bottom).toBeLessThanOrEqual(innerHeight)
  expect(bounds.left).toBeGreaterThanOrEqual(0)
  expect(bounds.right).toBeLessThanOrEqual(innerWidth)
  const body = dialog.querySelector('header')!.nextElementSibling!
  expect(body.scrollHeight).toBeGreaterThan(body.clientHeight)
  const footer = dialog.querySelector('footer')!.getBoundingClientRect()
  expect(footer.bottom).toBeLessThanOrEqual(bounds.bottom)
  const disconnect = screen.getByRole('button', {name: '연결 해제'})
  const button = disconnect.getBoundingClientRect()
  expect(
    disconnect.contains(
      document.elementFromPoint(button.x + button.width / 2, button.y + button.height / 2),
    ),
  ).toBe(true)
  fireEvent.click(screen.getByRole('button', {name: '닫기'}))
  expect(document.activeElement).toBe(trigger)
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  expect(codexPort.connect).not.toHaveBeenCalled()
  expect(codexPort.configureQuestions).not.toHaveBeenCalled()
})
