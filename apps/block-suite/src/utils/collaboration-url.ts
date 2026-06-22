const DEFAULT_ROOM = 'solid-block-suite'
const DEFAULT_YJS_PORT = '1234'

export const getCollaborationConfig = () => {
  const url = new URL(window.location.href)
  const room = url.searchParams.get('room') ?? DEFAULT_ROOM
  const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws'
  const websocketUrl =
    url.searchParams.get('websocketUrl') ??
    getDefaultWebsocketUrl({
      host: window.location.host,
      hostname: window.location.hostname,
      protocol,
    })

  return {
    room,
    websocketUrl,
  }
}

interface GetDefaultWebsocketUrlOptions {
  readonly host: string
  readonly hostname: string
  readonly protocol: string
}

const getDefaultWebsocketUrl = (options: GetDefaultWebsocketUrlOptions) => {
  if (options.host.endsWith(':5173')) {
    return `${options.protocol}://${options.hostname}:${DEFAULT_YJS_PORT}/collaboration`
  }

  return `${options.protocol}://${options.host}/collaboration`
}
