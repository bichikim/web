export const formatCurrency = (amount: number, currency: string): string =>
  new Intl.NumberFormat('en', {currency, style: 'currency'}).format(amount)

export const clearStoredPaymentMethod = (): void => localStorage.removeItem('payment-method')

export const trackCheckoutStarted = (): void => navigator.sendBeacon('/analytics/checkout')
