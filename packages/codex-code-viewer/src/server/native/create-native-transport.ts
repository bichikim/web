import {spawn} from 'node:child_process'
import {once} from 'node:events'
import {
  createMessageConnection,
  type MessageConnection,
  StreamMessageReader,
  StreamMessageWriter,
} from 'vscode-jsonrpc/node.js'

interface NativeTransportOptions {
  /** Analyzer executable launched without a shell. */
  readonly binary: string
  /** Working directory owned by the viewer workspace. */
  readonly root: string
  /** Receives stderr chunks; the caller owns any diagnostic retention. */
  readonly onStderr: (text: string) => void
}
export interface NativeTransport {
  readonly connection: MessageConnection
  readonly started: Promise<unknown>
  readonly dispose: (initialization: Promise<unknown>) => Promise<void>
}

/** Owns the analyzer process and RPC connection through startup, failure and final closure. */
export const createNativeTransport = (options: NativeTransportOptions): NativeTransport => {
  const child = spawn(options.binary, ['--lsp', '--stdio'], {cwd: options.root, stdio: 'pipe'})
  const started = once(child, 'spawn')
  const closed = new Promise<void>((resolve) => {
    child.once('close', () => resolve())
  })
  const connection = createMessageConnection(
    new StreamMessageReader(child.stdout),
    new StreamMessageWriter(child.stdin),
  )
  child.stderr.on('data', (chunk: Buffer) => options.onStderr(chunk.toString()))
  child.once('error', () => connection.dispose())
  child.once('exit', () => connection.dispose())
  connection.listen()
  let stopping: Promise<void> | undefined
  return {
    connection,
    dispose: (initialization): Promise<void> => {
      if (stopping === undefined) {
        const completed = Promise.allSettled([started, initialization, closed])
        connection.dispose()
        if (child.exitCode === null && child.signalCode === null) {
          child.kill()
        }
        stopping = completed.then(() => undefined)
      }
      return stopping
    },
    started,
  }
}
