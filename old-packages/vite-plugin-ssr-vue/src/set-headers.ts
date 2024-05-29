import http from 'node:http'
import {Headers} from 'src/types'

export const setHeaders = (res: http.ServerResponse, headers?: Headers) => {
  if (!headers) {
    return
  }
  for (const key of Object.keys(headers)) {
    res.setHeader(key, headers[key])
  }
}
