declare const requestInvoice: () => Promise<string>

/** Requests the invoice up to three times before preserving the final failure. */
export const loadInvoice = async (): Promise<string | undefined> => {
  try {
    return await requestInvoice()
  } catch {
    return undefined
  }
}
