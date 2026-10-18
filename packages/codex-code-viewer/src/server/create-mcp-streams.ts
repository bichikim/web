import {randomUUID} from 'node:crypto'
import type {WorkspaceScan} from './workspace-events/types'

interface McpScan {
  readonly session: string
  readonly channel: string
  readonly controller: AbortController
  readonly iterator: AsyncIterator<unknown>
  reading: boolean
}

/** Holds demand-driven scan cursors until completion, cancellation, replacement or session closure. */
export const createMcpStreams = () => {
  const scans = new Map<string, McpScan>()
  const close = (url: string): void => {
    const scan = scans.get(url)
    if (scan !== undefined) {
      scans.delete(url)
      scan.controller.abort()
      scan.iterator.return?.().catch(() => undefined)
    }
  }
  const closeSession = (session: string): void => {
    for (const [url, scan] of scans) {
      if (scan.session === session) {
        close(url)
      }
    }
  }
  return {
    close,
    closeSession,
    dispose: (): void => {
      for (const url of scans.keys()) {
        close(url)
      }
    },
    open: (session: string, channel: string, source: WorkspaceScan['source']): string => {
      for (const [url, scan] of scans) {
        if (scan.session === session && scan.channel === channel) {
          close(url)
        }
      }
      const controller = new AbortController()
      const iterator = source(controller.signal)[Symbol.asyncIterator]()
      const url = `code-viewer://scan/${randomUUID()}`
      scans.set(url, {channel, controller, iterator, reading: false, session})
      return url
    },
    read: async (url: string) => {
      const scan = scans.get(url)
      if (scan === undefined || scan.reading) {
        throw new Error('Scan unavailable')
      }
      scan.reading = true
      try {
        const next = await scan.iterator.next()
        scan.controller.signal.throwIfAborted()
        if (next.done) {
          close(url)
          return {done: true}
        }
        return {batch: next.value, done: false}
      } catch (error) {
        close(url)
        throw error
      } finally {
        scan.reading = false
      }
    },
  }
}
