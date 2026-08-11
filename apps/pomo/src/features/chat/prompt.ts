import type {ChatMessage} from './messages'

interface CreateChatPromptOptions {
  readonly messages: ReadonlyArray<ChatMessage>
  readonly summary: string
}

interface CreateSummaryPromptOptions {
  readonly messages: ReadonlyArray<ChatMessage>
  readonly previousSummary: string
}

interface ChatModelMessage {
  readonly content: string
  readonly role: 'assistant' | 'system' | 'user'
}

const CHAT_SYSTEM_PROMPT = `당신은 사용자의 이야기를 이어서 기억하는 친절한 한국어 대화 상대입니다.
정확하고 자연스럽게 답하고, 모르는 내용은 지어내지 마세요.
사용자가 요청하지 않으면 답변을 불필요하게 길게 늘이지 마세요.
아래에 이전 대화 요약이 있으면 사실과 사용자 선호를 대화의 일부로 취급하세요.`

const toTranscript = (messages: ReadonlyArray<ChatMessage>) =>
  messages
    .map((message) => `${message.role === 'user' ? '사용자' : '어시스턴트'}: ${message.content}`)
    .join('\n')

export const createChatMessages = (options: CreateChatPromptOptions): Array<ChatModelMessage> => {
  const systemContent =
    options.summary.length > 0
      ? `${CHAT_SYSTEM_PROMPT}\n\n이전 대화 요약:\n${options.summary}`
      : CHAT_SYSTEM_PROMPT

  return [
    {content: systemContent, role: 'system'},
    ...options.messages.map((message) => ({content: message.content, role: message.role})),
  ]
}

export const createSummaryMessages = (
  options: CreateSummaryPromptOptions,
): Array<ChatModelMessage> => [
  {
    content: `대화 기록을 다음 대화에서 기억해야 할 짧은 메모로 압축하세요.
사용자의 사실, 선호, 약속, 결정, 미해결 질문을 우선 보존하세요.
이미 지난 잡담과 반복은 버리고, 추측을 추가하지 마세요.
시간 순서를 유지한 한국어 글머리표만 출력하세요.`,
    role: 'system',
  },
  {
    content: `${
      options.previousSummary.length > 0 ? `기존 메모:\n${options.previousSummary}\n\n` : ''
    }새로 압축할 대화:\n${toTranscript(options.messages)}`,
    role: 'user',
  },
]
