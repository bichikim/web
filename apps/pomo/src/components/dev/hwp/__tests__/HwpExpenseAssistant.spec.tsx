/** @vitest-environment jsdom */

import {cleanup, fireEvent, render, screen, waitFor} from '@solidjs/testing-library'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'
import {createSignal} from 'solid-js'

import type {ChatController, ChatMessage} from '../../../../features/chat'

const chatMocks = vi.hoisted(() => ({
  controller: null as ChatController | null,
  prepare: vi.fn(),
  send: vi.fn(),
  setDraft: vi.fn(),
  useChat: vi.fn(),
}))

vi.mock('../../../../features/chat', () => ({
  useChat: chatMocks.useChat,
}))

import HwpExpenseAssistant from '../HwpExpenseAssistant'

const createController = (
  messages: () => ReadonlyArray<ChatMessage> = () => [],
): ChatController => ({
  answerDraft: () => null,
  canClear: () => false,
  canPrepare: () => false,
  canSend: () => true,
  clear: vi.fn(),
  contextTokens: () => 0,
  draft: () => '',
  isBusy: () => false,
  isModelReady: () => true,
  messages,
  modelId: () => 'gemma-4-e2b',
  prepare: chatMocks.prepare,
  selectModel: vi.fn(),
  send: chatMocks.send,
  setDraft: chatMocks.setDraft,
  state: () => ({status: 'ready'}),
  statusMessage: () => '모델 준비 완료',
  streamingText: () => '',
  summaryCount: () => 0,
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

beforeEach(() => {
  chatMocks.controller = createController()
  chatMocks.useChat.mockReturnValue(chatMocks.controller)
})

it('should use the Gemma model used by Pomo chat', () => {
  render(() => <HwpExpenseAssistant onApply={vi.fn()} />)

  expect(chatMocks.useChat).toHaveBeenCalledWith({modelId: 'gemma-4-e2b'})
})

it('should send the expense text to the local chat model with a structured extraction contract', () => {
  render(() => <HwpExpenseAssistant onApply={vi.fn()} />)

  const input = screen.getByLabelText('가계부 입력')
  fireEvent.input(input, {target: {value: '당근 2000원\n고구마 1000원 2개'}})
  fireEvent.click(screen.getByRole('button', {name: 'AI로 가계부 읽기'}))

  expect(chatMocks.setDraft).toHaveBeenCalledWith('당근 2000원\n고구마 1000원 2개')
  expect(chatMocks.send).toHaveBeenCalledWith(
    expect.objectContaining({refineAnswer: false, supplementaryContext: expect.any(String)}),
  )
})

it('should hide the apply action until a confirmed expense form exists', () => {
  render(() => <HwpExpenseAssistant onApply={vi.fn()} />)

  expect(screen.queryByRole('button', {name: '양식 필드에 적용'})).toBeNull()
})

it('should recover clear original expense text when Gemma replies in natural language', async () => {
  const [messages, setMessages] = createSignal<ReadonlyArray<ChatMessage>>([])
  chatMocks.controller = createController(messages)
  chatMocks.useChat.mockReturnValue(chatMocks.controller)
  render(() => <HwpExpenseAssistant onApply={vi.fn()} />)

  setMessages([
    {content: '당근 2000원\n고구마 1000원 2개', id: 'user-1', role: 'user'},
    {content: '당근과 고구마를 가계부에 기록했어요.', id: 'assistant-1', role: 'assistant'},
  ])

  await waitFor(() => expect(screen.getByText('당근')).toBeDefined())
  expect(screen.getByText('고구마')).toBeDefined()
  expect(screen.getByRole('button', {name: '양식 필드에 적용'})).toBeDefined()
})
