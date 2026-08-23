interface ServiceOperator {
  readonly businessAddress: string
  readonly businessName: string
  readonly businessRegistrationNumber: string
  readonly representative: string
  readonly supportEmail: string
  readonly supportPhone: string
  readonly webHostingProvider: string
}

export const SERVICE_OPERATOR = {
  businessAddress: '서울특별시 강남구 자곡로11길 11 301동 818호',
  businessName: '쿠웅',
  businessRegistrationNumber: '720-42-01404',
  representative: '김비치',
  supportEmail: 'info@pomofi.io',
  supportPhone: '070-5236-4741',
  webHostingProvider: 'Vercel Inc.',
} as const satisfies ServiceOperator
