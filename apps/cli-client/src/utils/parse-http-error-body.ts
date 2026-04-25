export const parseHttpErrorBody = async (response: Response): Promise<string> => {
  const text = await response.text()

  try {
    const parsed = JSON.parse(text) as {error?: unknown}

    if (typeof parsed.error === 'string') {
      return parsed.error
    }
  } catch {
    // ignore JSON parse failure
  }

  return text.length > 0 ? text : `HTTP ${String(response.status)}`
}
