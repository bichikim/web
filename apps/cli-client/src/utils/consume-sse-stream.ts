export interface ConsumeSseStreamArguments {
  readonly response: Response
  readonly onRawBlock: (rawBlock: string) => void
}

const normalizeNewlines = (text: string) => text.replaceAll('\r\n', '\n').replaceAll('\r', '\n')

export const consumeSseStream = async (arguments_: ConsumeSseStreamArguments): Promise<void> => {
  const reader = arguments_.response.body?.getReader()

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
      arguments_.onRawBlock(rawBlock)

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
    arguments_.onRawBlock(trailing)
  }
}
