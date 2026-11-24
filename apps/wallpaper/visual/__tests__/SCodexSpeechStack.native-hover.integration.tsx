import {cleanup, render, screen} from '@solidjs/testing-library'
import {afterEach, expect, test, vi} from 'vitest'
import {invoke, isTauri} from '@tauri-apps/api/core'
import {getCurrentWebviewWindow} from '@tauri-apps/api/webviewWindow'
import {SCodexSpeechStack} from '../../src/components/SCodexSpeechStack'
import type {CursorPosition} from '../../src/features/tracking/types'
import 'virtual:uno.css'

vi.mock('@tauri-apps/api/core', async (original) => ({
  ...(await original<typeof import('@tauri-apps/api/core')>()),
  invoke: vi.fn(),
  isTauri: vi.fn(),
}))
vi.mock('@tauri-apps/api/webviewWindow', () => ({getCurrentWebviewWindow: vi.fn()}))
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  vi.useRealTimers()
})

test('should reveal on global movement without changing focus or reopening on layout updates', async () => {
  let receive: ((event: {payload: CursorPosition}) => void) | null = null
  const unsubscribe = vi.fn()
  vi.mocked(isTauri).mockReturnValue(true)
  vi.mocked(invoke).mockResolvedValue(undefined)
  vi.mocked(getCurrentWebviewWindow).mockReturnValue({
    listen: vi.fn(async (_name: string, handler: (event: {payload: CursorPosition}) => void) => {
      receive = handler
      return unsubscribe
    }),
  } as unknown as ReturnType<typeof getCurrentWebviewWindow>)
  const view = render(() => (
    <main>
      <button type="button">다른 창의 작업</button>
      <div class="w-68 p-12">
        <SCodexSpeechStack
          activities={['A', 'B'].map((sessionId) => ({
            notificationId: 1,
            phase: 'working',
            receivedAt: 1,
            sessionId,
            text: '작업 중',
            title: sessionId,
            tool: null,
          }))}
        />
      </div>
    </main>
  ))
  await expect
    .poll(() => invoke)
    .toHaveBeenCalledWith('subscribe_poffo_cursor', expect.objectContaining({enabled: true}))
  const outside = screen.getByRole('button', {name: '다른 창의 작업'})
  outside.focus()
  const header = screen.getByRole('button', {name: '채팅 A 선택'}).getBoundingClientRect()
  const point = {
    height: innerHeight / 2,
    width: innerWidth / 2,
    x: (header.x + header.width / 2) / 2,
    y: (header.y + 16) / 2,
  }
  expect(screen.getAllByRole('listitem')).toHaveLength(1)
  vi.useFakeTimers({toFake: ['setTimeout', 'clearTimeout']})
  receive!({payload: point})
  expect(screen.getAllByRole('listitem')).toHaveLength(2)
  expect(document.activeElement).toBe(outside)
  vi.advanceTimersByTime(3000)
  expect(screen.getAllByRole('listitem')).toHaveLength(1)
  receive!({payload: point})
  expect(screen.getAllByRole('listitem')).toHaveLength(1)
  receive!({payload: {...point, x: point.x + 1}})
  expect(screen.getAllByRole('listitem')).toHaveLength(2)
  receive!({payload: {...point, x: -1}})
  vi.advanceTimersByTime(200)
  expect(screen.getAllByRole('listitem')).toHaveLength(1)
  expect(document.activeElement).toBe(outside)
  view.unmount()
  expect(unsubscribe).toHaveBeenCalledOnce()
  expect(invoke).toHaveBeenLastCalledWith(
    'subscribe_poffo_cursor',
    expect.objectContaining({enabled: false}),
  )
})
