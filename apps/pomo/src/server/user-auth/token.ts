import {createHash, randomBytes} from 'node:crypto'

const TOKEN_BYTES = 32

export const createOpaqueToken = (): string => randomBytes(TOKEN_BYTES).toString('base64url')

export const hashOpaqueToken = (token: string): string =>
  createHash('sha256').update(token).digest('hex')

export const readBearerToken = (request: Request): string | null => {
  const authorization = request.headers.get('Authorization')

  if (authorization === null || !authorization.startsWith('Bearer ')) {
    return null
  }

  const token = authorization.slice('Bearer '.length)
  return token.length > 0 ? token : null
}
