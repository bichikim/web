export const getDocument = () => {
  return typeof document !== 'undefined' ? document : null
}
