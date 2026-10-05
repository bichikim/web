// oxlint-disable eslint-js/camelcase -- Wllama generation options are fixed external contracts.
import type {Wllama} from '@wllama/wllama/esm/index.js'

import type {GenerateTextOptions} from './runtime'

interface GenerateGgufTextOptions {
  readonly model: Wllama
  readonly options: GenerateTextOptions
}

/** Streams the visible answer from a GGUF chat completion. */
export const generateGgufText = async ({
  model,
  options,
}: GenerateGgufTextOptions): Promise<string> => {
  options.signal?.throwIfAborted()
  let output = ''
  // llama.cpp accepts boolean token bans; Wllama's intersecting declarations omit this shape.
  const tokenBans: Record<string, unknown> =
    options.suppressedTokenIds === undefined
      ? {}
      : {logit_bias: Object.fromEntries(options.suppressedTokenIds.map((id) => [id, false]))}
  await model.createChatCompletion({
    ...tokenBans,
    abortSignal: options.signal,
    chat_template_kwargs: {enable_thinking: false},
    max_tokens: options.maximumTokens,
    messages: options.messages,
    onData: (chunk) => {
      const text = chunk.choices[0]?.delta.content ?? ''
      output += text
      if (text.length > 0) {
        options.onToken?.(text)
      }
    },
    penalty_repeat: options.repetitionPenalty,
    stream: true,
    temperature: options.temperature,
    top_k: options.topK,
    top_p: options.topP,
  })
  options.signal?.throwIfAborted()
  return output
}
