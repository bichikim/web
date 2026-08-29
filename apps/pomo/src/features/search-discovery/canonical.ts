import {SERVICE_POLICY_PATHS} from '../service-terms/policy-paths'

export const SEARCH_CONFIG = {
  indexablePaths: ['/', SERVICE_POLICY_PATHS.refund, '/third-party-notices'],
  origin: 'https://www.pomofi.io',
} as const
