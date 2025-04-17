const MAX_COUNT = 1_000_000

export const createUuid = (startFrom = 0) => {
  let uuid = startFrom

  return () => {
    uuid = (uuid + 1) % MAX_COUNT

    return uuid
  }
}
