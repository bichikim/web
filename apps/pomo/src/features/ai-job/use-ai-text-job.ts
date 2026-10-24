import {createAiJobSubmission} from './create-ai-job-submission'
import {
  type AiTextAccessStatus,
  type AiTextExecutionMode,
  useAiTextAccess,
} from './use-ai-text-access'
import {createAiJobSession} from './create-ai-job-session'
import {useAiJobPolling} from './use-ai-job-polling'
import {useAiJobResults} from './use-ai-job-results'
import {type Accessor, createMemo, createSignal, onCleanup} from 'solid-js'

import {aiJobClient, type AiJobClient} from './client'
import type {AiJob, AiJobResult} from './contracts'
import {
  type AiTextJobViewStatus,
  getClientErrorCode,
  getJobFailureMessage,
  getStatusMessage,
  isActiveJobStatus,
} from './status'
import {type AiJobStorage, browserAiJobStorage} from './storage'

const DEFAULT_POLL_DELAY_MILLISECONDS = 1_500

export type {AiTextExecutionMode, AiTextAccessStatus} from './use-ai-text-access'

interface AiTextJobState {
  readonly errorMessage: string | null
  readonly job: AiJob | null
  readonly result: AiJobResult | null
  readonly status: AiTextJobViewStatus
}

export interface UseAiTextJobProps {
  readonly client?: AiJobClient
  readonly onComplete: (text: string) => Promise<void>
  readonly pollDelayMilliseconds?: number
  readonly storage?: AiJobStorage
}

export interface AiTextJobController {
  readonly accessMessage: Accessor<string | null>
  readonly accessStatus: Accessor<AiTextAccessStatus>
  readonly actionMessage: Accessor<string | null>
  readonly artifactDeleted: Accessor<boolean>
  readonly cancel: () => Promise<boolean>
  readonly deleteArtifact: () => Promise<boolean>
  readonly executionMode: Accessor<AiTextExecutionMode>
  readonly errorMessage: Accessor<string | null>
  readonly isBusy: Accessor<boolean>
  readonly isCancelling: Accessor<boolean>
  readonly isDeleting: Accessor<boolean>
  readonly isRefreshingResult: Accessor<boolean>
  readonly isSaving: Accessor<boolean>
  readonly job: Accessor<AiJob | null>
  readonly jobResult: Accessor<AiJobResult | null>
  readonly jobStatus: Accessor<AiTextJobViewStatus>
  readonly refresh: () => Promise<boolean>
  readonly refreshResult: () => Promise<boolean>
  readonly retry: () => Promise<boolean>
  readonly saveArtifact: () => Promise<boolean>
  readonly serverAvailable: Accessor<boolean>
  readonly setExecutionMode: (mode: AiTextExecutionMode) => void
  readonly speakResult: () => Promise<boolean>
  readonly statusMessage: Accessor<string | null>
  readonly submit: (text: string) => Promise<boolean>
}

// oxlint-disable-next-line eslint/max-lines-per-function, eslint/max-statements -- Submission and recovery share one revision; storage, polling, and result lifecycles are composed below.
export const useAiTextJob = (props: UseAiTextJobProps): AiTextJobController => {
  const client = props.client ?? aiJobClient
  const storage = props.storage ?? browserAiJobStorage
  const pollDelayMilliseconds = props.pollDelayMilliseconds ?? DEFAULT_POLL_DELAY_MILLISECONDS
  const [state, setState] = createSignal<AiTextJobState>({
    errorMessage: null,
    job: null,
    result: null,
    status: 'idle',
  })
  const [isCancelling, setIsCancelling] = createSignal(false)
  let autoSpeakJobId: string | null = null

  const isBusy = createMemo(
    () => isActiveJobStatus(state().status) || state().status === 'submitting',
  )
  const statusMessage = createMemo(() => getStatusMessage(state()))
  const errorMessage = createMemo(() => state().errorMessage)
  const job = createMemo(() => state().job)
  const jobResult = createMemo(() => state().result)
  const jobStatus = createMemo(() => state().status)

  const session = createAiJobSession(storage)
  const {accessMessage, accessStatus, executionMode, serverAvailable, setExecutionMode} =
    useAiTextAccess({
      client,
      isBusy,
      onError: (errorMessage) => setState((current) => ({...current, errorMessage})),
      onRestore: async (saved) => {
        setState({
          errorMessage:
            saved.jobId === null ? '요청 상태를 확인한 뒤 다시 제출할 수 있어요.' : null,
          job: null,
          result: null,
          status: saved.jobId === null ? 'recovery_pending' : 'submitting',
        })
        if (saved.jobId !== null) {
          await refreshJob(saved.jobId)
        }
      },
      session,
    })
  const {isCurrent} = session
  const polling = useAiJobPolling({
    delayMilliseconds: pollDelayMilliseconds,
    refresh: () => refresh(),
    refreshJob,
    status: jobStatus,
  })
  const clearPollTimer = polling.clear
  const schedulePoll = polling.schedule
  const results = useAiJobResults({
    client,
    job,
    onComplete: (text) => props.onComplete(text),
    onError: (errorMessage) => setState((current) => ({...current, errorMessage})),
    onResult: (result) => setState((current) => ({...current, errorMessage: null, result})),
    result: jobResult,
    session,
  })
  const {
    actionMessage,
    artifactDeleted,
    deleteArtifact,
    isDeleting,
    isRefreshingResult,
    isSaving,
    loadResult,
    refreshResult,
    saveArtifact,
    speakResult,
  } = results
  const updateStateForJob = (nextJob: AiJob, result: AiJobResult | null = nextJob.result) => {
    const error = getJobFailureMessage(nextJob)
    setState({
      errorMessage: error.length === 0 ? null : error,
      job: nextJob,
      result,
      status: nextJob.status,
    })
  }
  const applyJob = async (nextJob: AiJob, revision: number): Promise<boolean> => {
    if (!isCurrent(revision)) {
      return false
    }

    updateStateForJob(nextJob)
    if (nextJob.status !== 'succeeded') {
      schedulePoll(nextJob)
      return true
    }

    clearPollTimer()
    const shouldSpeak = autoSpeakJobId === nextJob.id
    return loadResult(nextJob, revision, shouldSpeak)
  }
  async function refreshJob(jobId: string): Promise<boolean> {
    const revision = session.begin()
    clearPollTimer()
    try {
      const nextJob = await client.getJob(jobId)
      if (!isCurrent(revision)) {
        return false
      }
      return applyJob(nextJob, revision)
    } catch (error: unknown) {
      if (!isCurrent(revision)) {
        return false
      }
      const message =
        getClientErrorCode(error) === 'ai_job_not_found'
          ? '이 AI 작업을 찾지 못했어요. 새 요청으로 다시 시도해 주세요.'
          : 'AI 작업 상태를 확인하지 못했어요. 다시 확인해 주세요.'
      setState((current) => ({...current, errorMessage: message, status: 'error'}))
      return false
    }
  }
  const cancel = async (): Promise<boolean> => {
    if (isCancelling()) {
      return false
    }

    const currentJob = job()
    if (currentJob === null && state().status !== 'submitting') {
      return false
    }

    setIsCancelling(true)
    autoSpeakJobId = null
    const revision = session.begin()
    clearPollTimer()
    try {
      if (currentJob === null) {
        setState((current) => ({
          ...current,
          errorMessage: '요청 수락 여부를 확인해야 중복 생성을 막을 수 있어요.',
          status: 'recovery_pending',
        }))
        return true
      }

      const cancelledJob = await client.cancelJob(currentJob.id)
      if (!isCurrent(revision)) {
        return false
      }
      return applyJob(cancelledJob, revision)
    } catch (error: unknown) {
      if (!isCurrent(revision)) {
        return false
      }
      setState((current) => ({
        ...current,
        errorMessage: '취소 결과를 확인하지 못했어요. 작업 상태를 다시 확인해 주세요.',
      }))
      console.error('Failed to cancel the server AI job.', error)
      return false
    } finally {
      if (!session.isDisposed()) {
        setIsCancelling(false)
      }
    }
  }
  const refresh = async (): Promise<boolean> => {
    const currentJob = job()
    if (currentJob !== null) {
      return refreshJob(currentJob.id)
    }

    const saved = session.restore()
    if (saved?.jobId !== null && saved?.jobId !== undefined) {
      return refreshJob(saved.jobId)
    }
    return false
  }
  const {submit, retry} = createAiJobSubmission({
    canSubmit: () => executionMode() === 'server' && !isBusy() && serverAvailable(),
    client,
    onAccepted: (nextJob, revision) => {
      autoSpeakJobId = nextJob.id
      return applyJob(nextJob, revision)
    },
    onBegin: () => {
      clearPollTimer()
      autoSpeakJobId = null
      results.reset()
      setState({errorMessage: null, job: null, result: null, status: 'submitting'})
    },
    onFailure: (errorMessage, status) =>
      setState((current) => ({...current, errorMessage, status})),
    refreshJob,
    session,
    status: jobStatus,
  })
  onCleanup(session.dispose)

  return {
    accessMessage,
    accessStatus,
    actionMessage,
    artifactDeleted,
    cancel,
    deleteArtifact,
    errorMessage,
    executionMode,
    isBusy,
    isCancelling,
    isDeleting,
    isRefreshingResult,
    isSaving,
    job,
    jobResult,
    jobStatus,
    refresh,
    refreshResult,
    retry,
    saveArtifact,
    serverAvailable,
    setExecutionMode,
    speakResult,
    statusMessage,
    submit,
  }
}
