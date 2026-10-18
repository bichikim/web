import {CancellationTokenSource, type MessageConnection} from 'vscode-jsonrpc/node.js'

/** Sends one LSP request and cancels it when its owning lookup is aborted. */
export const requestNativeMessage = async (
  connection: Pick<MessageConnection, 'sendRequest'>,
  method: string,
  params: unknown,
  signal?: AbortSignal,
): Promise<unknown> => {
  signal?.throwIfAborted()
  const cancellation = new CancellationTokenSource()
  const cancel = (): void => cancellation.cancel()
  signal?.addEventListener('abort', cancel, {once: true})
  try {
    const result = await connection.sendRequest<unknown>(method, params, cancellation.token)
    signal?.throwIfAborted()
    return result
  } finally {
    signal?.removeEventListener('abort', cancel)
    cancellation.dispose()
  }
}
