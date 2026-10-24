'use server'

import {HEALTH_PROBE_STATUS, type HealthProbe} from 'src/features/system-health/contract'

/** Confirms that the SolidStart server-function transport reached the SSR server. */
export const checkServerHealth = async (): Promise<HealthProbe> => ({
  status: HEALTH_PROBE_STATUS,
})
