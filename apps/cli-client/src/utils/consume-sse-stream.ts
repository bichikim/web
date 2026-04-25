import {normalizeNewlines} from '@/utils/normalize-newlines'

export interface ConsumeSseStreamOptions {
  readonly response: Response
  readonly onRawBlock: (rawBlock: string) => void
}

export const consumeSseStream = async (options: ConsumeSseStreamOptions): Promise<void> => {
  const reader = options.response.body?.getReader()

  if (!reader) {
    throw new Error('응답 스트림을 읽을 수 없습니다.')
  }

  const decoder = new TextDecoder()
  let buffer = ''

  const flushEvents = (): void => {
    buffer = normalizeNewlines(buffer)

    let separatorIndex = buffer.indexOf('\n\n')

    while (separatorIndex !== -1) {
      const rawBlock = buffer.slice(0, separatorIndex)
      buffer = buffer.slice(separatorIndex + 2)
      options.onRawBlock(rawBlock)

      separatorIndex = buffer.indexOf('\n\n')
    }
  }

  const readNextChunk = async (): Promise<void> => {
    const {done, value} = await reader.read()

    if (value !== undefined) {
      buffer += decoder.decode(value, {stream: true})
    }

    flushEvents()

    if (!done) {
      await readNextChunk()
    }
  }

  await readNextChunk()

  const trailing = normalizeNewlines(buffer)

  if (trailing.trim().length > 0) {
    options.onRawBlock(trailing)
  }
}
