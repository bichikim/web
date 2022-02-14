import {} from 'vue'

export const getHtmlState = () => {
  if (import.meta.env.SSR) {
    return {}
  } else if (typeof window === 'object') {
    const state = window.__INITIAL_STATE__
    if (typeof state === 'object') {
      return state
    }
  }

  return {}
}

export const setHtmlState = (state: any, html?: string) => {
  // empty
}
