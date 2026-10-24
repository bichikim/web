/** @vitest-environment node */
import {request as httpRequest} from 'node:http'

import {afterEach, describe, expect, it} from 'vitest'

import {createRunnerHttpServer} from '../http'
import type {RunnerService} from '../types'

const jobId = '019d0000-0000-7000-8000-000000000001'

const createService = (): RunnerService => ({
  cancel: () => ({jobId, progress: 0, status: 'cancelled'}),
  close: async () => undefined,
  getStatus: () => ({jobId, progress: 0, status: 'queued'}),
  recover: () => undefined,
  submit: () => ({created: true, jobId}),
  waitForIdle: async () => undefined,
})

const send = (
  port: number,
  options: {
    readonly body?: string
    readonly method: string
    readonly token?: string
    readonly path: string
  },
): Promise<{readonly body: unknown; readonly status: number}> =>
  new Promise((resolve, reject) => {
    const request = httpRequest(
      {headers: {}, hostname: '127.0.0.1', method: options.method, path: options.path, port},
      (response) => {
        const chunks: Buffer[] = []
        response.on('data', (chunk: Buffer) => chunks.push(chunk))
        response.on('end', () => {
          resolve({
            body: JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown,
            status: response.statusCode ?? 0,
          })
        })
      },
    )
    if (options.token !== undefined) {
      request.setHeader('Authorization', `Bearer ${options.token}`)
    }
    if (options.body !== undefined) {
      request.setHeader('Content-Type', 'application/json')
      request.write(options.body)
    }
    request.on('error', reject)
    request.end()
  })

describe('runner HTTP server', () => {
  let server: ReturnType<typeof createRunnerHttpServer> | null = null

  afterEach(async () => {
    if (server !== null) {
      await new Promise<void>((resolve) => {
        server?.close(() => resolve())
      })
      server = null
    }
  })

  it('should expose authenticated liveness without submitting inference', async () => {
    server = createRunnerHttpServer({service: createService(), token: 'runner-token'})
    await new Promise<void>((resolve) => {
      server?.listen(0, '127.0.0.1', resolve)
    })
    const address = server.address()
    const port = typeof address === 'object' && address !== null ? address.port : 0
    await expect(send(port, {method: 'GET', path: '/v1/health'})).resolves.toMatchObject({
      status: 401,
    })
    await expect(
      send(port, {method: 'GET', path: '/v1/health', token: 'runner-token'}),
    ).resolves.toEqual({
      body: {protocolVersion: 1, status: 'ok'},
      status: 200,
    })
  })

  it('should require the configured bearer token', async () => {
    server = createRunnerHttpServer({service: createService(), token: 'runner-token'})
    await new Promise<void>((resolve) => {
      server?.listen(0, '127.0.0.1', () => resolve())
    })
    const address = server.address()
    const port = typeof address === 'object' && address !== null ? address.port : 0

    await expect(send(port, {method: 'GET', path: `/v1/jobs/${jobId}`})).resolves.toMatchObject({
      body: {error: {code: 'unauthorized'}},
      status: 401,
    })
  })

  it('should accept a versioned submit and read status through the same API', async () => {
    server = createRunnerHttpServer({service: createService(), token: 'runner-token'})
    await new Promise<void>((resolve) => {
      server?.listen(0, '127.0.0.1', () => resolve())
    })
    const address = server.address()
    const port = typeof address === 'object' && address !== null ? address.port : 0
    const body = JSON.stringify({
      capability: 'text',
      input: {messages: [{content: '안녕', role: 'user'}]},
      jobId,
      modelId: 'gemma-4-e2b',
      protocolVersion: 1,
    })

    await expect(
      send(port, {body, method: 'POST', path: '/v1/jobs', token: 'runner-token'}),
    ).resolves.toMatchObject({body: {jobId}, status: 201})
    await expect(
      send(port, {method: 'GET', path: `/v1/jobs/${jobId}`, token: 'runner-token'}),
    ).resolves.toMatchObject({body: {jobId, status: 'queued'}, status: 200})
  })
})
