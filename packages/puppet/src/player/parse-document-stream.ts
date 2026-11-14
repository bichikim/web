import {JSONParser} from '@streamparser/json'
import {type ParseDocumentResult, parseDocumentValue} from './parse-document'

export interface ParseDocumentStreamOptions {
  /** Consumed JSON bytes. Parsing errors and cancellation cancel the stream and release its lock. */
  readonly source: ReadableStream<Uint8Array>
  /** Cancels validation and reading; omitted to consume the complete stream. */
  readonly signal?: AbortSignal
}

const STRING_BUFFER = 65_536

export const parseDocumentStream = async (
  options: ParseDocumentStreamOptions,
): Promise<ParseDocumentResult> => {
  const {source, signal} = options
  signal?.throwIfAborted()
  try {
    const parser = new JSONParser({paths: ['$'], stringBufferSize: STRING_BUFFER})
    let value: unknown
    parser.onValue = ({value: parsed}) => {
      value = parsed
    }
    parser.onError = (error) => {
      throw new SyntaxError(error.message, {cause: error})
    }
    const input =
      signal === undefined
        ? source
        : source.pipeThrough(new TransformStream<Uint8Array, Uint8Array>(), {signal})
    await input.pipeTo(new WritableStream<Uint8Array>({write: (chunk) => parser.write(chunk)}))
    if (!parser.isEnded) {
      parser.end()
    }
    return parseDocumentValue(value)
  } catch (error) {
    signal?.throwIfAborted()
    if (error instanceof SyntaxError) {
      return {error: {code: 'invalid-json'}, ok: false}
    }
    throw error
  }
}
