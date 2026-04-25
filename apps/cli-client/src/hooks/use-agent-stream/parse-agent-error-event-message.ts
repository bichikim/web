export const parseAgentErrorEventMessage = (data: string): string => {
  try {
    const payload = JSON.parse(data) as unknown

    if (
      typeof payload === 'object' &&
      payload !== null &&
      'message' in payload &&
      typeof (payload as {message: unknown}).message === 'string'
    ) {
      return (payload as {message: string}).message
    }

    return data
  } catch {
    return data
  }
}
