import {SERVICE_POLICY_PATHS} from './service-policy'

export const SEARCH_CONFIG = {
  indexablePaths: ['/', SERVICE_POLICY_PATHS.refund, '/third-party-notices'],
  origin: 'https://www.pomofi.io',
} as const
