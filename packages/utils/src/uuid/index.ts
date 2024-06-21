const MAX_COUNT = 1_000_000
export const createUuid = () => {
  let uuid = 0
  return () => {
    uuid = (uuid + 1) % MAX_COUNT
    return uuid
  }
}
