import http from 'http'
import {Headers} from 'src/types'

export const setHeaders = (res: http.ServerResponse, headers?: Headers) => {
  if (!headers) {
    return
  }
  Object.keys(headers).forEach((key) => res.setHeader(key, headers[key]))
}
