import {createTimeout} from '@winter-love/solid-use/timeout'
import {type Accessor, onCleanup, onMount} from 'solid-js'
import type {AiJob} from './contracts'
import {type AiTextJobViewStatus, isActiveJobStatus} from './status'
import {SERVER_AI_RELEASED} from './release'

export interface UseAiJobPollingProps {
  readonly delayMilliseconds: number
  readonly status: Accessor<AiTextJobViewStatus>
  readonly refresh: () => Promise<boolean>
  readonly refreshJob: (jobId: string) => Promise<boolean>
}

export const useAiJobPolling = (props: UseAiJobPollingProps) => {
  let disposed = false
  const poll = createTimeout(
    (jobId: string) => {
      props.refreshJob(jobId).catch(() => undefined)
    },
    () => props.delayMilliseconds,
  )
  const clear = poll.cancel
  const schedule = (job: AiJob) => {
    clear()
    if (disposed || !isActiveJobStatus(job.status)) {
      return
    }
    // The job API supplies snapshots, so retain the existing one-shot poll after each response.
    poll.execute(job.id)
  }
  onMount(() => {
    if (!SERVER_AI_RELEASED) {
      return
    }
    const refreshOnResume = () => {
      if (isActiveJobStatus(props.status())) {
        props.refresh().catch(() => undefined)
      }
    }
    globalThis.document.addEventListener('visibilitychange', refreshOnResume)
    globalThis.addEventListener('online', refreshOnResume)
    onCleanup(() => {
      globalThis.document.removeEventListener('visibilitychange', refreshOnResume)
      globalThis.removeEventListener('online', refreshOnResume)
    })
  })
  onCleanup(() => {
    disposed = true
    clear()
  })
  return {clear, schedule}
}
