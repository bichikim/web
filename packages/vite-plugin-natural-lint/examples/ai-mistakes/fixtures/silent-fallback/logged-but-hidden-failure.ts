declare const requestOrders: () => Promise<ReadonlyArray<string>>

export const loadOrders = async (): Promise<ReadonlyArray<string>> => {
  try {
    return await requestOrders()
  } catch (error: unknown) {
    console.error(error)
    return []
  }
}
