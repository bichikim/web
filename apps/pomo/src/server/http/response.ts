const HTTP_OK = 200
const HTTP_NO_CONTENT = 204
const NO_STORE_HEADERS = {
  'Cache-Control': 'no-store',
  Pragma: 'no-cache',
  'X-Content-Type-Options': 'nosniff',
} as const

interface NoStoreResponseOptions {
  readonly cookies?: ReadonlyArray<string>
  readonly headers?: HeadersInit
  readonly status?: number
}

const createNoStoreHeaders = (options: NoStoreResponseOptions): Headers => {
  const headers = new Headers(options.headers)

  for (const [name, value] of Object.entries(NO_STORE_HEADERS)) {
    headers.set(name, value)
  }

  for (const cookie of options.cookies ?? []) {
    headers.append('Set-Cookie', cookie)
  }

  return headers
}

/** Creates a private JSON response using the Web Response contract expected by SolidStart. */
export const noStoreJson = <Body>(body: Body, options: NoStoreResponseOptions = {}): Response =>
  Response.json(body, {
    headers: createNoStoreHeaders(options),
    status: options.status ?? HTTP_OK,
  })

/** Creates a private text response using the Web Response contract expected by SolidStart. */
export const noStoreText = (body: string, options: NoStoreResponseOptions = {}): Response =>
  new Response(body, {
    headers: createNoStoreHeaders(options),
    status: options.status ?? HTTP_OK,
  })

/** Creates a private empty response. */
export const noStoreEmpty = (options: NoStoreResponseOptions = {}): Response =>
  new Response(null, {
    headers: createNoStoreHeaders(options),
    status: options.status ?? HTTP_NO_CONTENT,
  })

/** Adds private-response protections to an upstream Web Response without consuming its body. */
export const withNoStore = (response: Response): Response =>
  new Response(response.body, {
    headers: createNoStoreHeaders({headers: response.headers}),
    status: response.status,
    statusText: response.statusText,
  })
