export const createAccessTokenForServiceAccount = (accountId: string): string =>
  `service-account:${accountId}`
