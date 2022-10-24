export const env = {
  get apiUrl() {
    return 'server/'
  },
  get primaryColor() {
    return import.meta.env.VITE_PRIMARY_COLOR ?? 'rgba(245, 158, 11, 1)'
  },
}
