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
  let timer: ReturnType<typeof setTimeout> | undefined
  let disposed = false
  const clear = () => {
    if (timer !== undefined) {
      clearTimeout(timer)
      timer = undefined
    }
  }
  const schedule = (job: AiJob) => {
    clear()
    if (disposed || !isActiveJobStatus(job.status)) {
      return
    }
    // The job API supplies snapshots, so retain the existing one-shot poll after each response.
    timer = setTimeout(() => {
      props.refreshJob(job.id).catch(() => undefined)
    }, props.delayMilliseconds)
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
