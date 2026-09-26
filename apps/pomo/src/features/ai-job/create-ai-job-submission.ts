import type {Accessor} from 'solid-js'
import {type AiJobClient, createAiJobIdempotencyKey} from './client'
import type {AiJob} from './contracts'
import type {AiJobSession} from './create-ai-job-session'
import type {StoredAiTextJob} from './storage'
import {
  type AiTextJobViewStatus,
  createTextInput,
  getSubmissionErrorMessage,
  isTerminalSubmissionError,
} from './status'

export interface AiJobSubmissionOptions {
  readonly client: AiJobClient
  readonly session: AiJobSession
  readonly canSubmit: Accessor<boolean>
  readonly status: Accessor<AiTextJobViewStatus>
  readonly refreshJob: (jobId: string) => Promise<boolean>
  readonly onBegin: () => void
  readonly onAccepted: (job: AiJob, revision: number) => Promise<boolean>
  readonly onFailure: (message: string, status: 'error' | 'recovery_pending') => void
}

export const createAiJobSubmission = (props: AiJobSubmissionOptions) => {
  const handleSubmissionError = (error: unknown, revision: number): boolean => {
    if (!props.session.isCurrent(revision)) {
      return false
    }

    props.onFailure(
      getSubmissionErrorMessage(error),
      isTerminalSubmissionError(error) ? 'error' : 'recovery_pending',
    )
    return false
  }
  const submitStored = async (saved: StoredAiTextJob): Promise<boolean> => {
    const revision = props.session.begin()
    props.onBegin()
    props.session.persist({...saved, jobId: null})

    try {
      const response = await props.client.submitTextJob({
        idempotencyKey: saved.idempotencyKey,
        input: saved.input,
      })
      if (!props.session.isCurrent(revision)) {
        return false
      }

      props.session.persist({...saved, jobId: response.job.id})
      return props.onAccepted(response.job, revision)
    } catch (error: unknown) {
      return handleSubmissionError(error, revision)
    }
  }
  const submit = async (text: string): Promise<boolean> => {
    const normalizedText = text.trim()
    if (normalizedText.length === 0 || !props.canSubmit()) {
      return false
    }

    const saved: StoredAiTextJob = {
      idempotencyKey: createAiJobIdempotencyKey(),
      input: createTextInput(normalizedText),
      jobId: null,
    }
    return submitStored(saved)
  }
  const retry = async (): Promise<boolean> => {
    const status = props.status()
    if (status === 'recovery_pending') {
      const saved = props.session.restore()
      if (saved?.jobId !== null && saved?.jobId !== undefined) {
        return props.refreshJob(saved.jobId)
      }
      if (saved !== null) {
        return submitStored(saved)
      }
      return false
    }

    if (!['error', 'failed', 'cancelled', 'timed_out'].includes(status)) {
      return false
    }

    const saved = props.session.restore()
    if (saved === null) {
      return false
    }
    return submitStored({...saved, idempotencyKey: createAiJobIdempotencyKey(), jobId: null})
  }

  return {retry, submit}
}
