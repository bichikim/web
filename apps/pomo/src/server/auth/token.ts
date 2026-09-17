export const readBearerToken = (request: Request): string | null => {
  const authorization = request.headers.get('Authorization')

  if (authorization === null || !authorization.startsWith('Bearer ')) {
    return null
  }

  const token = authorization.slice('Bearer '.length)
  return token.length > 0 ? token : null
}
