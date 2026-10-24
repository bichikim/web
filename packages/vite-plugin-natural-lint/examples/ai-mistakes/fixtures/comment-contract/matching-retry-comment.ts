declare const requestInvoice: () => Promise<string>

/** Requests the invoice up to three times before preserving the final failure. */
export const loadInvoice = async (): Promise<string> => {
  return requestInvoice()
    .catch(() => requestInvoice())
    .catch(() => requestInvoice())
}
