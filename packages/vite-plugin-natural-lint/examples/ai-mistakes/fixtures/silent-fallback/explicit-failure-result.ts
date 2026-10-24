declare const requestInvoice: () => Promise<string>

type InvoiceResult =
  | {readonly status: 'failure'; readonly error: unknown}
  | {readonly status: 'success'; readonly value: string}

export const loadInvoiceResult = async (): Promise<InvoiceResult> => {
  try {
    return {status: 'success', value: await requestInvoice()}
  } catch (error: unknown) {
    return {error, status: 'failure'}
  }
}
