export const createOnce = (runner: () => any) => {
  let isRun = false
  return () => {
    if (!isRun) {
      runner()
      isRun = true
    }
  }
}
