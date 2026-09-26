declare const requestInvoices: () => Promise<readonly string[]>

export const loadInvoices = async (): Promise<readonly string[]> => {
  try {
    return await requestInvoices()
  } catch {
    return []
  }
}
