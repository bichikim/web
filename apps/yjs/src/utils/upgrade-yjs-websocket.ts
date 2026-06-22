import type {IncomingMessage} from 'node:http'
import type {Socket} from 'node:net'
import {URL} from 'node:url'
import {WebSocketServer} from 'ws'
import {setupWSConnection} from 'y-websocket/bin/utils'

const COLLABORATION_PATH_PREFIX = '/collaboration/'

export interface UpgradeServer {
  on(
    event: 'upgrade',
    listener: (request: IncomingMessage, socket: Socket, head: Buffer) => void,
  ): void
}

export const bindYjsWebSocket = (server: UpgradeServer) => {
  const websocketServer = new WebSocketServer({noServer: true})

  websocketServer.on('connection', (websocket, request) => {
    setupWSConnection(websocket, request, {
      docName: getDocumentName(request),
    })
  })

  server.on('upgrade', (request, socket, head) => {
    if (!isCollaborationRequest(request)) {
      socket.destroy()
      return
    }

    websocketServer.handleUpgrade(request, socket, head, (websocket) => {
      websocketServer.emit('connection', websocket, request)
    })
  })
}

const isCollaborationRequest = (request: IncomingMessage) => {
  if (request.url === undefined) {
    return false
  }

  const url = new URL(request.url, 'http://localhost')
  const room = url.pathname.slice(COLLABORATION_PATH_PREFIX.length)

  return url.pathname.startsWith(COLLABORATION_PATH_PREFIX) && room.length > 0
}

const getDocumentName = (request: IncomingMessage) => {
  if (request.url === undefined) {
    return ''
  }

  const url = new URL(request.url, 'http://localhost')

  return url.pathname.slice(COLLABORATION_PATH_PREFIX.length)
}
