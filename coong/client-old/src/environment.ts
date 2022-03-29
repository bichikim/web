export const apiUrl = () => {
  return import.meta.env.VITE_API_URL ?? '/server'
}

export const staticUrl = () => {
  return import.meta.env.VITE_STATIC_URL ?? '/static'
}
