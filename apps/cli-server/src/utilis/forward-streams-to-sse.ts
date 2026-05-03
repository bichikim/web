import {type Result, type Subprocess} from 'execa'
import {type SSEStreamingApi} from 'hono/streaming'

const encodeChunk = (chunk: string | Uint8Array) =>
  typeof chunk === 'string' ? chunk : Buffer.from(chunk).toString('utf8')

/**
 * stdout/stderr 청크를 SSE 로 보냄. 두 스트림은 병렬로 읽음.
 */
export const forwardStreamsToSse = async (
  subprocess: Subprocess,
  sse: SSEStreamingApi,
  onStdoutChunk?: (chunk: string) => void,
): Promise<Result> => {
  const {stderr, stdout} = subprocess

  if (!stdout || !stderr) {
    await sse.writeSSE({
      data: JSON.stringify({
        message: 'Cannot stream CLI: stdout/stderr not available.',
      }),
      event: 'error',
    })

    return (await subprocess) as unknown as Result
  }

  const pipeOne = async (readable: NodeJS.ReadableStream, eventName: 'stderr' | 'stdout') => {
    for await (const chunk of readable) {
      const encoded = encodeChunk(chunk)

      if (eventName === 'stdout') {
        onStdoutChunk?.(encoded)
      }

      await sse.writeSSE({
        data: encoded,
        event: eventName,
      })
    }
  }

  await Promise.all([pipeOne(stdout, 'stdout'), pipeOne(stderr, 'stderr'), subprocess])

  return (await subprocess) as unknown as Result
}
