// oxlint-disable eslint-js/camelcase -- Wllama generation options are fixed external contracts.
import type {Wllama} from '@wllama/wllama/esm/index.js'

import {GGUF_CONFIG} from './gguf-config'
import type {GenerateTextOptions} from './runtime'

interface GenerateGgufTextOptions {
  readonly model: Wllama
  readonly options: GenerateTextOptions
}

const generateAnswer = async ({model, options}: GenerateGgufTextOptions): Promise<string> => {
  options.signal?.throwIfAborted()
  let output = ''
  let answerPrefix = ''
  let finishReason: string | null = null
  let completionTokens: number | undefined
  let reasoningTokens: number | undefined
  const appendAnswer = (text: string) => {
    if (text.length === 0) {
      return
    }
    output += text
    options.onToken?.(text)
  }
  // llama.cpp accepts boolean token bans; Wllama's intersecting declarations omit this shape.
  const tokenBans: Record<string, unknown> =
    options.suppressedTokenIds === undefined
      ? {}
      : {logit_bias: Object.fromEntries(options.suppressedTokenIds.map((id) => [id, false]))}
  await model.createChatCompletion({
    ...tokenBans,
    abortSignal: options.signal,
    chat_template_kwargs: {enable_thinking: true},
    // Reserve the requested answer allowance after reasoning and its closing sequence.
    max_tokens:
      options.maximumTokens +
      GGUF_CONFIG.maximumReasoningTokens +
      GGUF_CONFIG.reasoningClosingTokens,
    messages: options.messages,
    onData: (chunk) => {
      const [choice] = chunk.choices
      finishReason = choice?.finish_reason ?? finishReason
      completionTokens =
        chunk.usage?.completion_tokens ?? chunk.timings?.predicted_n ?? completionTokens
      reasoningTokens = chunk.usage?.completion_tokens_details?.reasoning_tokens ?? reasoningTokens
      const text = choice?.delta.content ?? ''
      if (output.length > 0) {
        appendAnswer(text)
        return
      }
      // A forced reasoning boundary can be repeated in content and split across chunks.
      answerPrefix = (answerPrefix + text).replace(/^(?:\s*<\/think>)+\s*/u, '')
      if ('</think>'.startsWith(answerPrefix.trimStart())) {
        return
      }
      appendAnswer(answerPrefix)
      answerPrefix = ''
    },
    penalty_repeat: options.repetitionPenalty,
    stream: true,
    temperature: options.temperature,
    top_k: options.topK,
    top_p: options.topP,
  })
  options.signal?.throwIfAborted()
  if (answerPrefix.trim().length > 0) {
    appendAnswer(answerPrefix)
  }
  if (output.trim().length === 0) {
    console.warn('GGUF completion ended without a visible answer.', {
      completionTokens,
      finishReason,
      maximumTokens: options.maximumTokens,
      reasoningTokens,
    })
  }
  return output
}

/** Streams the visible GGUF answer, retrying once when no answer was generated. */
export const generateGgufText = async (options: GenerateGgufTextOptions): Promise<string> => {
  const answer = await generateAnswer(options)
  if (answer.trim().length > 0) {
    return answer
  }
  const retry = await generateAnswer({
    model: options.model,
    options: {
      ...options.options,
      messages: [
        ...options.options.messages,
        {
          content:
            'Complete your reasoning concisely, then provide the complete final answer to the original request. ' +
            'Do not return an empty answer.',
          role: 'user',
        },
      ],
    },
  })
  if (retry.trim().length > 0) {
    return retry
  }
  throw new Error('모델이 추론 후 답변 본문을 만들지 못했어요. 다시 시도해 주세요.')
}
