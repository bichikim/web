import {clamp} from 'es-toolkit/math'
import {revalidate} from '@solidjs/router'
import {type Accessor, createEffect, onCleanup} from 'solid-js'

interface QueryRevalidationAfterDelay {
  readonly kind: 'after-delay'
  readonly milliseconds: number
}

interface QueryRevalidationAtTime {
  readonly kind: 'at-time'
  readonly timestamp: number
}

const MAXIMUM_TIMEOUT_DELAY_MILLISECONDS = 2_147_483_647

export type QueryRevalidationSchedule = QueryRevalidationAfterDelay | QueryRevalidationAtTime | null

export interface CreateQueryRevalidationSchedulerProps {
  readonly key: Accessor<string>
  readonly schedule: Accessor<QueryRevalidationSchedule>
}

const getScheduleDelay = (schedule: Exclude<QueryRevalidationSchedule, null>): number => {
  switch (schedule.kind) {
    case 'after-delay':
      return Math.max(0, schedule.milliseconds)
    case 'at-time':
      return Math.max(0, schedule.timestamp - Date.now())
    default: {
      const exhaustiveSchedule: never = schedule
      return exhaustiveSchedule
    }
  }
}

/** Revalidates an active Solid Router query at the externally selected time. */
export const createQueryRevalidationScheduler = (
  props: CreateQueryRevalidationSchedulerProps,
): void => {
  createEffect(() => {
    const key = props.key()
    const schedule = props.schedule()

    if (schedule === null) {
      return
    }

    const delay = getScheduleDelay(schedule)
    const revalidateQuery = (): void => {
      revalidate(key).catch(() => undefined)
    }

    if (delay <= MAXIMUM_TIMEOUT_DELAY_MILLISECONDS) {
      const timer = setTimeout(revalidateQuery, delay)
      onCleanup(() => clearTimeout(timer))
      return
    }

    const deadline = Date.now() + delay
    let timer: ReturnType<typeof setTimeout>

    const scheduleTimer = (): void => {
      const remainingDelay = Math.max(0, deadline - Date.now())
      timer = setTimeout(
        () => {
          if (Date.now() < deadline) {
            scheduleTimer()
            return
          }

          revalidateQuery()
        },
        clamp(remainingDelay, 0, MAXIMUM_TIMEOUT_DELAY_MILLISECONDS),
      )
    }

    scheduleTimer()

    onCleanup(() => clearTimeout(timer))
  })
}
