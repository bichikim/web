import {once} from 'node:events'
import {createConnection, type Socket} from 'node:net'
import {
  createMessageConnection,
  type MessageConnection,
  SocketMessageReader,
  SocketMessageWriter,
} from 'vscode-jsonrpc/node.js'
import {z} from 'zod'
import {withAbort} from '../with-abort'
import {requestNativeMessage} from './request-native-message'

const endpointSchema = z.object({pipe: z.string().min(1)})
const snapshotSchema = z.object({snapshot: z.number().int().positive()})

/** Retains project membership in the LSP session through a single API snapshot per preparation. */
export const createNativePreparation = (control: Pick<MessageConnection, 'sendRequest'>) => {
  const controller = new AbortController()
  const files = new Set<string>()
  const dispatches: WeakMap<object, () => void> = new WeakMap()
  let batches = 0
  let fallback = false
  let socket: Socket | undefined
  let connection: MessageConnection | undefined
  let pending: Promise<MessageConnection> | undefined
  const close = (): void => {
    connection?.dispose()
    socket?.destroy()
  }
  const connect = async (): Promise<MessageConnection> => {
    const {pipe} = endpointSchema.parse(
      await requestNativeMessage(control, 'custom/initializeAPISession', {}, controller.signal),
    )
    controller.signal.throwIfAborted()
    socket = createConnection(pipe)
    await once(socket, 'connect', {signal: controller.signal})
    controller.signal.throwIfAborted()
    const writer = new SocketMessageWriter(socket)
    connection = createMessageConnection(new SocketMessageReader(socket), {
      dispose: () => writer.dispose(),
      end: () => writer.end(),
      onClose: writer.onClose,
      onError: writer.onError,
      write: async (message) => {
        await writer.write(message)
        if ('params' in message && typeof message.params === 'object' && message.params !== null) {
          dispatches.get(message.params)?.()
        }
      },
    })
    connection.listen()
    await requestNativeMessage(connection, 'initialize', null, controller.signal)
    return connection
  }
  return {
    diagnostics: () => ({batches, fallback, files: files.size}),
    dispose: (): void => {
      controller.abort()
      close()
    },
    /** Returns false for an unavailable API so the caller can retain document-based preparation. */
    prepare: async (
      paths: readonly string[],
      signal?: AbortSignal,
      dispatched?: () => void,
    ): Promise<boolean> => {
      const combined = AbortSignal.any([
        controller.signal,
        ...(signal === undefined ? [] : [signal]),
      ])
      combined.throwIfAborted()
      if (paths.length === 0 || fallback) {
        return !fallback
      }
      try {
        pending ??= connect()
        const client = await withAbort(pending, combined)
        const params = {openFiles: paths}
        const sent = Promise.withResolvers<void>()
        dispatches.set(params, sent.resolve)
        const response = withAbort(
          requestNativeMessage(client, 'updateSnapshot', params, combined),
          combined,
        )
        // Observe failure immediately even when the transport signal wins the race.
        const settled = Promise.allSettled([response])
        let value: unknown
        try {
          await withAbort(Promise.race([sent.promise, response]), combined)
          dispatched?.()
          value = await response
        } finally {
          dispatches.delete(params)
          await settled
        }
        const {snapshot} = snapshotSchema.parse(value)
        // Releasing the snapshot leaves this API session's open-file project references retained.
        await withAbort(requestNativeMessage(client, 'release', {snapshot}, combined), combined)
        paths.forEach((path) => files.add(path))
        batches += 1
        return true
      } catch {
        combined.throwIfAborted()
        fallback = true
        files.clear()
        close()
        return false
      }
    },
  }
}
