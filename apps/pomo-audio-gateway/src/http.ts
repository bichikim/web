import {applyCorsHeaders} from './cors'

const HTTP_NO_CONTENT = 204

export const createErrorResponse = (
  status: number,
  code: string,
  allowedOrigin: string | null,
): Response => {
  const headers = new Headers({
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  })
  applyCorsHeaders(headers, allowedOrigin)

  return Response.json({error: code}, {headers, status})
}

export const createPreflightResponse = (allowedOrigin: string | null): Response => {
  const headers = new Headers({
    'Access-Control-Allow-Headers': 'Range',
    'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
    'Access-Control-Max-Age': '86400',
    'Cache-Control': 'no-store',
  })
  applyCorsHeaders(headers, allowedOrigin)
  return new Response(null, {headers, status: HTTP_NO_CONTENT})
}
