export const getSelfUrl = () => {
  return import.meta.env.VITE_API_URL ?? 'http://localhost:3000'
}
