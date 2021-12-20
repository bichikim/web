const trimUrlRegx = /^[\s/]+|[\s/]+$/ugi

const protocolRegx = /^(?:https?|ftp):\/\//u

const hostRegx = /^[_a-z-]+(?:\.[_a-z-]+){1,2}$/u

// ^? 로 안하는 이유는 jest 테스트 컴파일중 신택스 오류가 있어서
const firstQueryRegx = /^[?]/u

const trimQueryRegx = /^[?&]/u

const MAX_RESOLVE_URL = 200

export const createResolveUrl = (max: number = MAX_RESOLVE_URL) => {
  return (...urls: string[]): string => {
    return urls.map((url) => {
      return url.slice(0, max).replace(trimUrlRegx, '')
    }).join('/')
  }
}
/**
 * "/ /s" 를 각각 trim 하고 "/"로 연결 합니다
 * @param urls 주소 배열
 */
export const resolveUrl = createResolveUrl()

export interface ChunkedUrlResult {
  chunkedUrl: string[]
  host?: string
  protocol?: string
}

/**
 * url 를 분해 합니다
 * @param url 주소 문자열
 */
export const chunkUrl = (url: string) => {
  const leftUrl: string = url.replace(protocolRegx, '')

  const [protocol] = url.split(leftUrl)

  const [maybeHost, ...chunkedUrl] = leftUrl.split('/')

  const hasHost = hostRegx.test(maybeHost)

  const result: ChunkedUrlResult = {
    chunkedUrl: [],
  }

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

/**
 * join each string with "&" queries and prepend "?"
 * @param queries
 */
export const joinQuery = (...queries: string[]) => {
  const [first, ...restQueries] = queries

  const _first = first.replace(firstQueryRegx, '')

  return `?${[_first, ...restQueries].join('&')}`
}

/**
 * key value 패어에서 one query string 리턴
 * todo value array 와 object 도 지원 가능 하게
 * @param key
 * @param value
 */
export const queryFromEntire = (key: string, value: string) => {
  const _key = key.replace(trimQueryRegx, '')

  if (process.env.NODE_ENV === 'development' && key.length !== _key.length) {
    console.warn('key start with ? or &')
  }
  return `${_key}=${encodeURIComponent(value)}`
}

export const resolveQuery = (record: Record<string, any>) => {
  const list = Object.entries(record).map(([key, value]) => queryFromEntire(key, value))
  return joinQuery(...list)
}
