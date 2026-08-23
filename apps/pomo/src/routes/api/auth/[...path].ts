import type {APIEvent} from '@solidjs/start/server'

import {readBoundedRequest} from 'src/server/http/body'
import {noStoreText} from 'src/server/http/response'
import {handlePomoAuthProxy} from '../../../server/auth/proxy.ts'

const MAXIMUM_BODY_SIZE = 16_384
const readAuthParams = (params: Readonly<Record<string, string>>): {readonly path: string} => ({
  path: params.path ?? '',
})

export const GET = (event: APIEvent): Promise<Response> =>
  handlePomoAuthProxy({params: readAuthParams(event.params), request: event.request})

export const POST = async (event: APIEvent): Promise<Response> => {
  const requestResult = await readBoundedRequest(event, MAXIMUM_BODY_SIZE)

  if (!requestResult.success) {
    return noStoreText('Invalid authentication payload', {status: requestResult.status})
  }

  return handlePomoAuthProxy({
    params: readAuthParams(event.params),
    request: requestResult.request,
  })
}
