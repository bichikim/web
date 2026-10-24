import {expect, test} from '@playwright/test'
import type {CreateWorkerTransportOptions, WorkerTransport} from 'src/utils/worker-transport'

interface WorkerTransportModule {
  readonly createWorkerTransport: <Request, Response>(
    options: CreateWorkerTransportOptions<Response>,
  ) => WorkerTransport<Request>
}

test('delivers browser Worker messages and failures through the shared transport', async ({
  page,
}) => {
  await page.goto('/')

  const result = await page.evaluate(async () => {
    const modulePath = '/src/utils/worker-transport/index.ts'
    const transportModule: WorkerTransportModule = await import(/* @vite-ignore */ modulePath)
    const {createWorkerTransport} = transportModule
    const createWorkerUrl = (source: string) =>
      URL.createObjectURL(new Blob([source], {type: 'text/javascript'}))

    const messageWorkerUrl = createWorkerUrl(
      'self.onmessage = (event) => self.postMessage("received:" + event.data)',
    )
    const errorWorkerUrl = createWorkerUrl(
      'self.onmessage = () => { throw new Error("worker failed") }',
    )

    try {
      const message = await new Promise<string>((resolve, reject) => {
        const worker = new Worker(messageWorkerUrl)
        const transport = createWorkerTransport<string, string>({
          onFailure: (failure) => {
            transport.dispose()
            reject(failure)
          },
          onResponse: (response) => {
            transport.dispose()
            resolve(response)
          },
          worker,
        })

        transport.send('hello')
      })
      const failure = await new Promise<{code: string; detail: string}>((resolve, reject) => {
        const worker = new Worker(errorWorkerUrl)
        const transport = createWorkerTransport<string, never>({
          onFailure: (workerFailure) => {
            transport.dispose()
            resolve({code: workerFailure.code, detail: workerFailure.detail})
          },
          onResponse: (response) => {
            transport.dispose()
            reject(response)
          },
          worker,
        })

        transport.send('fail')
      })

      return {failure, message}
    } finally {
      URL.revokeObjectURL(messageWorkerUrl)
      URL.revokeObjectURL(errorWorkerUrl)
    }
  })

  expect(result).toEqual({
    failure: {code: 'worker-error', detail: 'Uncaught Error: worker failed'},
    message: 'received:hello',
  })
})

test('transfers buffer ownership through the shared transport', async ({page}) => {
  await page.goto('/')

  const result = await page.evaluate(async () => {
    const modulePath = '/src/utils/worker-transport/index.ts'
    const transportModule: WorkerTransportModule = await import(/* @vite-ignore */ modulePath)
    const workerUrl = URL.createObjectURL(
      new Blob(
        ['self.onmessage = (event) => self.postMessage(Array.from(new Uint8Array(event.data)))'],
        {type: 'text/javascript'},
      ),
    )
    const buffer = new Uint8Array([2, 4, 6]).buffer
    let detachedLength = -1
    let transport: WorkerTransport<ArrayBuffer> | undefined
    try {
      const bytes = await new Promise<Array<number>>((resolve, reject) => {
        transport = transportModule.createWorkerTransport<ArrayBuffer, Array<number>>({
          onFailure: reject,
          onResponse: resolve,
          worker: new Worker(workerUrl),
        })
        transport.send(buffer, [buffer])
        detachedLength = buffer.byteLength
      })
      return {bytes, detachedLength}
    } finally {
      transport?.dispose()
      URL.revokeObjectURL(workerUrl)
    }
  })

  expect(result).toEqual({bytes: [2, 4, 6], detachedLength: 0})
})
