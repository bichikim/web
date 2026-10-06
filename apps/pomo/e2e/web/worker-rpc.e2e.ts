import {expect, test} from '@playwright/test'
import type {CreateWorkerRpcTransportOptions, WorkerRpcTransport} from 'src/features/worker-rpc'

interface BufferRequest {
  readonly buffer: ArrayBuffer
  readonly requestId: number
}

interface BufferResponse {
  readonly bytes: Array<number>
  readonly requestId: number
}

interface WorkerRpcModule {
  readonly createWorkerRpcTransport: <Request, Response>(
    options: CreateWorkerRpcTransportOptions<Response>,
  ) => WorkerRpcTransport<Request, Response>
}

test('correlates real Worker replies and transfers buffer ownership through RPC', async ({
  page,
}) => {
  await page.goto('/')

  const result = await page.evaluate(async () => {
    const modulePath = '/src/features/worker-rpc/index.ts'
    const rpcModule: WorkerRpcModule = await import(/* @vite-ignore */ modulePath)
    const workerUrl = URL.createObjectURL(
      new Blob(
        [
          'self.onmessage = ({data}) => self.postMessage({' +
            'requestId: data.requestId, bytes: Array.from(new Uint8Array(data.buffer))})',
        ],
        {type: 'text/javascript'},
      ),
    )
    const transport = rpcModule.createWorkerRpcTransport<BufferRequest, BufferResponse>({
      getRequestId: (response) => response.requestId,
      onEvent: () => {},
      worker: new Worker(workerUrl),
    })
    try {
      const buffer = new Uint8Array([3, 5, 7]).buffer
      const first = transport.request({
        createRequest: (requestId) => ({buffer, requestId}),
        transfer: [buffer],
      })
      const detachedLength = buffer.byteLength
      const copied = new Uint8Array([8, 9]).buffer
      const second = transport.request({
        createRequest: (requestId) => ({buffer: copied, requestId}),
      })
      const responses = await Promise.all([first, second])
      transport.dispose()
      const disposedCode = await transport
        .request({
          createRequest: (requestId) => ({buffer: copied, requestId}),
        })
        .then(
          () => 'resolved',
          (failure: {code: string}) => failure.code,
        )
      return {copiedLength: copied.byteLength, detachedLength, disposedCode, responses}
    } finally {
      transport.dispose()
      URL.revokeObjectURL(workerUrl)
    }
  })

  expect(result).toEqual({
    copiedLength: 2,
    detachedLength: 0,
    disposedCode: 'disposed',
    responses: [
      {bytes: [3, 5, 7], requestId: 1},
      {bytes: [8, 9], requestId: 2},
    ],
  })
})
