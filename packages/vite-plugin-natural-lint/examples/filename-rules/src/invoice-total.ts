export interface InvoiceLine {
  readonly amount: number
}

export const calculateInvoiceTotal = (lines: ReadonlyArray<InvoiceLine>): number =>
  lines.reduce((total, line) => total + line.amount, 0)
