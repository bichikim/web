import {randomUUID} from 'node:crypto'
import {createServer, type ServerResponse} from 'node:http'

const HTTP_OK = 200
const HTTP_NOT_FOUND = 404

interface WorkspaceEvents {
  readonly token: string
  readonly streams: Set<ServerResponse>
  revision: number
}

/** Publishes workspace change signals on a session-scoped loopback event stream. */
export const createWorkspaceEvents = () => {
  const workspaces = new Map<string, WorkspaceEvents>()
  const paths = new Map<string, WorkspaceEvents>()
  const server = createServer((request, response) => {
    const events = request.method === 'GET' ? paths.get(request.url ?? '') : undefined
    if (events === undefined) {
      response.writeHead(HTTP_NOT_FOUND).end()
      return
    }
    response.writeHead(HTTP_OK, {
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-store',
      'Content-Type': 'text/event-stream',
    })
    events.streams.add(response)
    response.write(`data: ${events.revision}\n\n`)
    response.on('close', () => events.streams.delete(response))
  })
  let listening: Promise<void> | null = null
  const start = (): Promise<void> => {
    listening ??= new Promise<void>((resolve, reject) => {
      server.once('error', reject)
      server.listen(0, '127.0.0.1', () => {
        server.removeListener('error', reject)
        server.unref()
        resolve()
      })
    }).catch((error: unknown) => {
      listening = null
      throw error
    })
    return listening
  }
  const close = (session: string): void => {
    const events = workspaces.get(session)
    if (events !== undefined) {
      paths.delete(`/${events.token}`)
      workspaces.delete(session)
      for (const response of events.streams) {
        response.end()
      }
    }
  }
  return {
    changed: (session: string): void => {
      const events = workspaces.get(session)
      if (events !== undefined) {
        events.revision += 1
        for (const response of events.streams) {
          response.write(`data: ${events.revision}\n\n`)
        }
      }
    },
    closed: close,
    dispose: async (): Promise<void> => {
      for (const session of workspaces.keys()) {
        close(session)
      }
      await listening?.catch(() => undefined)
      if (server.listening) {
        await new Promise<void>((resolve, reject) => {
          server.close((error) => {
            if (error === undefined) {
              resolve()
            } else {
              reject(error)
            }
          })
          server.closeAllConnections()
        })
      }
    },
    watch: async (session: string): Promise<string> => {
      let events = workspaces.get(session)
      if (events === undefined) {
        events = {revision: 0, streams: new Set(), token: randomUUID()}
        workspaces.set(session, events)
        paths.set(`/${events.token}`, events)
      }
      await start()
      // Session closure during listener startup must not recreate a closed stream.
      if (workspaces.get(session) !== events) {
        throw new Error('Workspace session expired')
      }
      const address = server.address()
      if (address === null || typeof address === 'string') {
        throw new Error('Workspace event listener unavailable')
      }
      return `http://127.0.0.1:${address.port}/${events.token}`
    },
  }
}
