export const isSameOriginRequest = (request: Request): boolean => {
  const origin = request.headers.get('origin')

  if (origin === null) {
    return false
  }

  try {
    return new URL(origin).origin === new URL(request.url).origin
  } catch {
    return false
  }
}
