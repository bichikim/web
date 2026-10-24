import {HEALTH_PROBE_STATUS, type HealthProbe} from 'src/features/system-health/contract'
import {noStoreJson} from 'src/server/http/response'

export const GET = (): Response =>
  noStoreJson<HealthProbe>({
    status: HEALTH_PROBE_STATUS,
  })
