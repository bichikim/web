import {once} from 'node:events'
import type {ServerResponse} from 'node:http'
import type {WorkspaceScan} from './types'

const HTTP_OK = 200

/** Sends scan batches with socket backpressure and releases discovery on disconnect. */
export const sendScan = async (
  scan: WorkspaceScan,
  response: ServerResponse,
  close: () => void,
): Promise<void> => {
  scan.response = response
  response.writeHead(HTTP_OK, {
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'no-store',
    'Content-Type': 'application/x-ndjson',
  })
  response.flushHeaders()
  response.once('close', close)
  try {
    for await (const batch of scan.source(scan.controller.signal)) {
      scan.controller.signal.throwIfAborted()
      if (!response.write(`${JSON.stringify(batch)}\n`)) {
        await once(response, 'drain', {signal: scan.controller.signal})
      }
    }
    response.end(`${JSON.stringify({done: true})}\n`)
  } catch {
    if (!scan.controller.signal.aborted) {
      response.end(`${JSON.stringify({error: 'read-failed'})}\n`)
    }
  } finally {
    close()
  }
}
