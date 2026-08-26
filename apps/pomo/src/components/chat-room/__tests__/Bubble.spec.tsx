/** @vitest-environment jsdom */

import {render, screen} from '@solidjs/testing-library'
import {beforeEach, describe, expect, it, vi} from 'vitest'

import {ChatBubble} from '../Bubble'
import {ProcessedKoreanText} from '../ProcessedKoreanText'

vi.mock('../ProcessedKoreanText', () => ({ProcessedKoreanText: vi.fn()}))

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(ProcessedKoreanText).mockImplementation((props) => <span>{props.text}</span>)
})

describe('ChatBubble', () => {
  it('should render a user message without processed text', () => {
    render(() => (
      <ChatBubble
        isVoiceGenerating={false}
        message={{content: 'user message', id: 'user-1', role: 'user'}}
      />
    ))

    expect(screen.getByText(/나:/)).toBeInTheDocument()
    expect(screen.getByText('user message')).toBeInTheDocument()
    expect(ProcessedKoreanText).not.toHaveBeenCalled()
  })

  it('should render an assistant message with voice generation status', () => {
    render(() => (
      <ChatBubble
        isVoiceGenerating
        message={{content: 'assistant message', id: 'assistant-1', role: 'assistant'}}
      />
    ))

    expect(screen.getByText(/모델:/)).toBeInTheDocument()
    expect(screen.getByText('assistant message')).toBeInTheDocument()
    expect(screen.getByText('답변 음성 생성 중')).toBeInTheDocument()
  })

  it('should omit voice generation status for a completed assistant message', () => {
    render(() => (
      <ChatBubble
        isVoiceGenerating={false}
        message={{content: 'assistant message', id: 'assistant-2', role: 'assistant'}}
      />
    ))

    expect(screen.queryByText('답변 음성 생성 중')).not.toBeInTheDocument()
  })
})
