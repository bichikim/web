import {APIEvent} from '@solidjs/start/server'
import {createIPX, createIPXH3App, ipxFSStorage, ipxHttpStorage} from 'ipx'
import {toWebHandler} from 'h3'
import {getSelfUrl} from 'src/utils/self-url'

const ipx = createIPX({
  httpStorage: ipxHttpStorage({domains: [getSelfUrl()]}),
  storage: ipxFSStorage({dir: './public'}),
})

const handler = toWebHandler(createIPXH3App(ipx))

export const GET = (event: APIEvent) => {
  const parts = event.request.url.split(`${event.request.headers.get('host')}/img`)

  return handler(new Request(parts[0] + event.request.headers.get('host') + parts[1]))
}
