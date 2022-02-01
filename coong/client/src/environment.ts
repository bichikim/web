export const apiUrl = () => {
  return import.meta.env.VITE_API_URL ?? '/server'
}
