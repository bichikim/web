import {pathToFileURL} from 'node:url'
import type {MessageConnection} from 'vscode-jsonrpc/node.js'
import {z} from 'zod'
import {offsetPosition} from './offset-position'

interface DocumentState {
  readonly source: string
  readonly version: number
}
const diagnosticsSchema = z.object({uri: z.string(), version: z.number()})

/** Synchronizes document versions and optionally waits for their analysis completion notification. */
export const createDocumentSync = (
  connection: MessageConnection,
  language: string,
  encoding: 'utf-16' | 'utf-32' = 'utf-16',
  diagnostics = false,
) => {
  const documents = new Map<string, DocumentState>()
  const analyzed = new Map<string, number>()
  const waiting = new Set<() => void>()
  let disposed = false
  if (diagnostics) {
    connection.onNotification('textDocument/publishDiagnostics', (value: unknown) => {
      const parsed = diagnosticsSchema.safeParse(value)
      if (parsed.success) {
        analyzed.set(parsed.data.uri, parsed.data.version)
        for (const notify of waiting) {
          notify()
        }
      }
    })
  }
  const synchronize = async (path: string, source: string, incremental: boolean) => {
    const uri = pathToFileURL(path).href
    const previous = documents.get(uri)
    const version = previous?.source === source ? previous.version : (previous?.version ?? 0) + 1
    if (previous === undefined) {
      await connection.sendNotification('textDocument/didOpen', {
        textDocument: {languageId: language, text: source, uri, version},
      })
    } else if (previous.source !== source) {
      await connection.sendNotification('textDocument/didChange', {
        contentChanges: [
          {
            ...(incremental
              ? {
                  range: {
                    end: offsetPosition(previous.source, previous.source.length, encoding),
                    start: {character: 0, line: 0},
                  },
                }
              : {}),
            text: source,
          },
        ],
        textDocument: {uri, version},
      })
    }
    documents.set(uri, {source, version})
    return uri
  }
  const waitForAnalysis = async (uri: string): Promise<void> => {
    if (!diagnostics || disposed) {
      return
    }
    await new Promise<void>((resolve) => {
      const notify = (): void => {
        if (disposed || (analyzed.get(uri) ?? 0) >= (documents.get(uri)?.version ?? 1)) {
          waiting.delete(notify)
          resolve()
        }
      }
      waiting.add(notify)
      notify()
    })
  }
  const dispose = (): void => {
    disposed = true
    for (const notify of waiting) {
      notify()
    }
  }
  return {dispose, synchronize, waitForAnalysis}
}
