export const P_SILENT_MOUTH_RETURN_DELAY_MS = 100

export interface PSilentMouthReturn {
  readonly cancel: () => void
  readonly schedule: () => void
}

/** Debounces sustained silence before returning the rendered mouth to a closed shape. */
export const createPSilentMouthReturn = (onReturn: () => void): PSilentMouthReturn => {
  let hasReturned = false
  let timer: number | null = null

  const cancel = () => {
    if (timer !== null) {
      window.clearTimeout(timer)
      timer = null
    }

    hasReturned = false
  }

  const schedule = () => {
    if (hasReturned || timer !== null) {
      return
    }

    timer = window.setTimeout(() => {
      timer = null
      hasReturned = true
      onReturn()
    }, P_SILENT_MOUTH_RETURN_DELAY_MS)
  }

  return {cancel, schedule}
}
