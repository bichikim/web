import {createCloudTextTask} from '../cloud-text/create-cloud-text-task'
import * as m from '@paraglide/message'
import {parseJson} from '@winter-love/utils'
import {z} from 'zod'
import {CLOUD_CHAT_SUMMARY_CHARACTERS, planCloudChatRequest} from './plan-cloud-chat-request'
import type {ChatClient, CreateChatClientOptions} from './client'

const MAXIMUM_NEW_TOKENS = 2048
const SUMMARY_OUTPUT_HEADROOM = 1024
const compactedReplySchema = z.object({
  answer: z.string().trim().min(1),
  summary: z.string().trim().min(1).max(CLOUD_CHAT_SUMMARY_CHARACTERS),
})

const parseCompactedReply = (value: string) => {
  const text = value.trim()
  const wrapped = /^```(?:json)?\s*(?<json>[\s\S]*?)\s*```$/iu.exec(text)
  const payload: unknown = parseJson(wrapped?.groups?.json ?? text)
  const parsed = compactedReplySchema.safeParse(payload)
  return parsed.success ? parsed.data : null
}

export const createCloudChatClient = (options: CreateChatClientOptions): ChatClient => {
  const task = createCloudTextTask()
  const reportError = (message: string) =>
    options.onResponse({message, restartRequired: false, type: 'error'})

  return {
    dispose: task.dispose,
    generate: (context, replyId, generateOptions = {}) => {
      if (generateOptions.outputSchema !== undefined) {
        options.onResponse({
          message: '구조화 출력은 기기 모델에서만 사용할 수 있어요.',
          restartRequired: false,
          type: 'error',
        })
        return
      }
      const plan = planCloudChatRequest(context, generateOptions.supplementaryContext)
      if (plan === null) {
        reportError(m.cloud_text_failed())
        return
      }
      const compact = plan.mode === 'compact'
      task.generate({
        maximumTokens: MAXIMUM_NEW_TOKENS + (compact ? SUMMARY_OUTPUT_HEADROOM : 0),
        messages: plan.messages,
        onComplete: (response) => {
          const result = compact
            ? parseCompactedReply(response.text)
            : {answer: response.text, summary: plan.context.summary}
          if (result === null) {
            reportError(m.cloud_text_failed())
            return
          }
          const {answer, summary} = result
          const message = {content: answer, id: replyId, role: 'assistant'} as const
          options.onResponse({
            context: {messages: [...plan.context.messages, message], summary},
            contextTokens: response.tokenCount,
            message,
            type: 'complete',
            wasCompacted: compact,
          })
        },
        onError: reportError,
        onStarted: () =>
          options.onResponse({contextTokens: 0, type: 'started', wasCompacted: false}),
      })
    },
    prepare: () => options.onResponse({type: 'ready'}),
  }
}
