const QUARTER_MONTHS = 3

export const calculateRenewalPrice = (monthlyPrice: number): number => monthlyPrice * QUARTER_MONTHS
