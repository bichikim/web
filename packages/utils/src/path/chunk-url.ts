const protocolRegx = /^(?:https?|ftp):\/\//u
// todo unsafe 원인을 모르겠습니다 연구중
// eslint-disable-next-line unicorn/no-unsafe-regex
const hostRegx = /^[_a-z-]{1,50}(?:\.[_a-z-]{1,50}){1,2}$/u

export interface ChunkedUrlResult {
  chunkedUrl: string[]
  host?: string
  protocol?: string
  query?: string
}

/**
 * url 를 분해 합니다
 * @param url 주소 문자열
 */
export const chunkUrl = (url: string): ChunkedUrlResult => {
  const leftUrl: string = url.replace(protocolRegx, '')

  const protocol = url.replace(leftUrl, '')
  // noinspection JSUnusedLocalSymbols
  const [path, query] = leftUrl.split('?')

  const [maybeHost, ...chunkedUrl] = path.split('/')

  const hasHost = hostRegx.test(maybeHost)

  const result: ChunkedUrlResult = {
    chunkedUrl: [],
  }

  result.query = query

  if (protocol) {
    result.protocol = protocol
  }

  if (hasHost) {
    result.host = maybeHost
    result.chunkedUrl = chunkedUrl
  } else {
    result.chunkedUrl = [maybeHost, ...chunkedUrl]
  }

  return result
}
