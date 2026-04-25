export interface SseEventBlock {
  readonly event: string
  readonly data: string
}

export const parseSseEventBlock = (block: string): SseEventBlock | undefined => {
  const lines = block.split('\n')
  let eventName = 'message'
  const dataLines: string[] = []

  for (const line of lines) {
    if (line.startsWith('event:')) {
      eventName = line.slice('event:'.length).trim()
    } else if (line.startsWith('data:')) {
      dataLines.push(line.slice('data:'.length).trimStart())
    }
  }

  if (dataLines.length === 0) {
    return undefined
  }

  return {data: dataLines.join('\n'), event: eventName}
}
