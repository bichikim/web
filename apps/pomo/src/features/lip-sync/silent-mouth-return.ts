export const P_SILENT_MOUTH_RETURN_DELAY_MS = 100

export interface PSilentMouthReturn {
  readonly cancel: () => void
  readonly schedule: () => void
}

/** Debounces sustained silence before returning the rendered mouth to a closed shape. */
export const createPSilentMouthReturn = (onReturn: () => void): PSilentMouthReturn => {
  let hasReturned = false
  let timer: ReturnType<typeof globalThis.setTimeout> | null = null

  const cancel = () => {
    if (timer !== null) {
      globalThis.clearTimeout(timer)
      timer = null
    }

    hasReturned = false
  }

  const schedule = () => {
    if (hasReturned || timer !== null) {
      return
    }

    timer = globalThis.setTimeout(() => {
      timer = null
      hasReturned = true
      onReturn()
    }, P_SILENT_MOUTH_RETURN_DELAY_MS)
  }

  return {cancel, schedule}
}
