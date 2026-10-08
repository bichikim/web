import {Pool, type PoolClient} from '@neondatabase/serverless'
import {on} from 'node:events'
import {env} from 'src/env'
import {withNoStore} from 'src/server/http/response'
import {readCloudTextJob} from './job-status'

async function* readSubscribedJobEvents(
  client: PoolClient,
  userId: string,
  requestId: string,
  signal: AbortSignal,
) {
  const notifications = on(client, 'notification', {signal})
  try {
    // Subscribe before the snapshot so a concurrent completion remains observable.
    await client.query(`LISTEN "pomo_cloud_text_${requestId.replaceAll('-', '')}"`)
    const initial = await readCloudTextJob(userId, requestId)
    yield initial
    if (initial?.kind !== 'pending') {
      return
    }
    for await (const _notification of notifications) {
      const result = await readCloudTextJob(userId, requestId)
      yield result
      if (result?.kind !== 'pending') {
        return
      }
    }
  } finally {
    await notifications.return?.()
  }
}

/** Streams owned job state after subscribing to committed database changes. */
async function* readJobEvents(userId: string, requestId: string, signal: AbortSignal) {
  if (env.DATABASE_URL_UNPOOLED === undefined) {
    throw new TypeError('DATABASE_URL_UNPOOLED is required for cloud text result notifications')
  }
  const pool = new Pool({connectionString: env.DATABASE_URL_UNPOOLED})
  try {
    const client = await pool.connect()
    try {
      for await (const event of readSubscribedJobEvents(client, userId, requestId, signal)) {
        yield event
      }
    } finally {
      client.release(true)
    }
  } finally {
    await pool.end()
  }
}

/** Creates a request-scoped notification stream with disconnect cleanup. */
export const streamCloudTextJob = (
  userId: string,
  requestId: string,
  requestSignal: AbortSignal,
  cookies: ReadonlyArray<string>,
): Response => {
  const disconnect = new AbortController()
  const signal = AbortSignal.any([requestSignal, disconnect.signal])
  const events = readJobEvents(userId, requestId, signal)
  const encoder = new TextEncoder()
  const body = new ReadableStream<Uint8Array>({
    cancel: async () => {
      disconnect.abort()
      await events.return(undefined)
    },
    pull: async (controller) => {
      try {
        const event = await events.next()
        if (event.done) {
          controller.close()
        } else {
          controller.enqueue(encoder.encode(`${JSON.stringify(event.value)}\n`))
        }
      } catch (error: unknown) {
        controller.error(error)
      }
    },
  })
  const headers = new Headers({'Content-Type': 'application/x-ndjson; charset=utf-8'})
  for (const cookie of cookies) {
    headers.append('Set-Cookie', cookie)
  }
  return withNoStore(new Response(body, {headers}))
}
