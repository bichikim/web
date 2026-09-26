import {isPlainObject} from 'es-toolkit/predicate'
export const HEALTH_PROBE_STATUS = 'ok'

export interface HealthProbe {
  readonly status: typeof HEALTH_PROBE_STATUS
}

export type HealthTargetStatus = 'healthy' | 'unhealthy'

export interface SystemHealthResult {
  readonly api: HealthTargetStatus
  readonly serverFunction: HealthTargetStatus
}

export const isHealthProbe = (value: unknown): value is HealthProbe => {
  if (!isPlainObject(value)) {
    return false
  }

  return Reflect.get(value, 'status') === HEALTH_PROBE_STATUS
}
