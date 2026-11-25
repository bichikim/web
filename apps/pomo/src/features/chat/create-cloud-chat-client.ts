import {executeCalendarTool} from '../calendar/agent-tool'
import type {CalendarToolClock} from '../calendar/agent-tool-contract'
import {createCloudTextTask} from '../cloud-text/create-cloud-text-task'
import * as m from '@paraglide/message'
import {parseJson} from '@winter-love/utils'
import {z} from 'zod'
import {CLOUD_CHAT_SUMMARY_CHARACTERS, planCloudChatRequest} from './plan-cloud-chat-request'
import type {ChatClient, CreateChatClientOptions} from './client'

const MAXIMUM_NEW_TOKENS = 2048
const SUMMARY_OUTPUT_HEADROOM = 1024
const compactedReplySchema = z.object({
  answer: z.string().trim(),
  calendarTool: z.unknown().optional(),
  summary: z.string().trim().min(1).max(CLOUD_CHAT_SUMMARY_CHARACTERS),
})
const calendarReplySchema = z.strictObject({calendarTool: z.unknown()})

const parseReplyJson = (value: string): unknown => {
  const text = value.trim()
  const wrapped = /^```(?:json)?\s*(?<json>[\s\S]*?)\s*```$/iu.exec(text)
  return parseJson(wrapped?.groups?.json ?? text)
}

interface CloudReplyOptions {
  readonly calendarTool?: CalendarToolClock
  readonly compact: boolean
  readonly signal: AbortSignal
  readonly summary: string
  readonly text: string
}

const completeCloudReply = async (options: CloudReplyOptions) => {
  const {calendarTool, compact, signal, summary, text} = options
  if (!compact && calendarTool === undefined) {
    return {answer: text, summary}
  }

  const payload = parseReplyJson(text)
  if (compact) {
    const reply = compactedReplySchema.safeParse(payload)
    if (!reply.success) {
      return null
    }
    const answer =
      calendarTool !== undefined && reply.data.calendarTool !== undefined
        ? await executeCalendarTool(reply.data.calendarTool, calendarTool.timeZone, signal)
        : reply.data.answer
    return answer.length > 0 ? {answer, summary: reply.data.summary} : null
  }

  const lookup = calendarReplySchema.safeParse(payload)
  if (!lookup.success || calendarTool === undefined) {
    return {answer: text, summary}
  }

  const answer = await executeCalendarTool(lookup.data.calendarTool, calendarTool.timeZone, signal)
  return {answer, summary}
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
      const plan = planCloudChatRequest(
        context,
        generateOptions.supplementaryContext,
        generateOptions.calendarTool,
      )
      if (plan === null) {
        reportError(m.cloud_text_failed())
        return
      }
      const compact = plan.mode === 'compact'
      task.generate({
        maximumTokens: MAXIMUM_NEW_TOKENS + (compact ? SUMMARY_OUTPUT_HEADROOM : 0),
        messages: plan.messages,
        onComplete: async (response, signal) => {
          const result = await completeCloudReply({
            calendarTool: generateOptions.calendarTool,
            compact,
            signal,
            summary: plan.context.summary,
            text: response.text,
          })
          if (signal.aborted) {
            return
          }
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
