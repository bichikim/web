export interface CartLine {
  readonly price: number
  readonly quantity: number
}

export const calculateCartTotal = (lines: ReadonlyArray<CartLine>): number =>
  lines.reduce((total, line) => total + line.price * line.quantity, 0)
