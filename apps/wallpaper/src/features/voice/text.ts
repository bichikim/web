import {fromMarkdown} from 'mdast-util-from-markdown'
import type {CodexActivity, CodexQuestionRequest} from '../codex/types'

interface TextNode {
  readonly type: string
  readonly value?: string
  readonly children?: readonly TextNode[]
}
const BLOCKS = new Set(['paragraph', 'heading', 'blockquote'])
const OMITTED = new Set(['code', 'html', 'image', 'imageReference', 'definition'])
const WORKING_PLACEHOLDERS = new Set([
  'Codex가 작업하고 있어요.',
  'Codex가 도구를 사용하고 있어요.',
])
const readChildren = (nodes: readonly TextNode[]): string => {
  let codeDepth = 0
  return nodes
    .map((node) => {
      const tag = node.value ?? ''
      if (node.type === 'html' && /^<\/?(?:code|pre)(?:\s|>)/iu.test(tag)) {
        codeDepth = tag.startsWith('</') ? Math.max(0, codeDepth - 1) : codeDepth + 1
        return ''
      }
      return codeDepth === 0 ? readNode(node) : ''
    })
    .join('')
}
const readNode = (node: TextNode): string => {
  if (OMITTED.has(node.type)) {
    return ''
  }
  if (node.type === 'text' || node.type === 'inlineCode') {
    return node.value ?? ''
  }
  if (node.type === 'break') {
    return '\n'
  }
  const text = readChildren(node.children ?? [])
  if (node.type === 'listItem') {
    return `\n\n${text.trim()}\n\n`
  }
  return BLOCKS.has(node.type) ? `${text}\n` : text
}

/** Returns speakable prose with list boundaries and inline code contents, excluding code blocks, markup and link destinations. */
export const spokenText = (markdown: string): string =>
  readNode(fromMarkdown(markdown))
    .split(/\n{2,}/u)
    .map((part) => part.replace(/\s+/gu, ' ').trim())
    .filter((part) => part.length > 0)
    .join('\n\n')

export interface VoiceMessage {
  readonly id: string
  readonly chat: string
  readonly text: string
}

/** Selects conversational text, excluding generic working statuses, command payloads and tool labels. */
export const voiceMessage = (
  activity: CodexActivity | undefined,
  questions: readonly CodexQuestionRequest[] = [],
): VoiceMessage | null => {
  if (activity === undefined || activity.phase === 'idle') {
    return null
  }
  const prompts = questions.filter((item) => item.sessionId === activity.sessionId)
  const source =
    prompts.length > 0
      ? prompts.flatMap((item) => item.questions.map((question) => question.question)).join('\n')
      : activity.phase === 'response'
        ? (activity.response ?? activity.text)
        : activity.text
  const text = spokenText(source)
  const placeholder =
    prompts.length === 0 && activity.phase === 'working' && WORKING_PLACEHOLDERS.has(text)
  return text === '' || placeholder
    ? null
    : {
        chat: activity.sessionId,
        id:
          prompts.length > 0
            ? prompts.map((item) => item.id).join(':')
            : String(activity.notificationId),
        text,
      }
}
