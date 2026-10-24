import {createAiJobOutput} from './create-ai-job-output'
import {type Accessor, createSignal} from 'solid-js'
import type {AiJobArtifactDeleteResult, AiJobClient} from './client'
import type {AiJob, AiJobResult} from './contracts'
import type {AiJobSession} from './create-ai-job-session'
import {getClientErrorCode} from './status'

export interface UseAiJobResultsProps {
  readonly client: AiJobClient
  readonly job: Accessor<AiJob | null>
  readonly result: Accessor<AiJobResult | null>
  readonly session: AiJobSession
  readonly onComplete: (text: string) => Promise<void>
  readonly onError: (message: string) => void
  readonly onResult: (result: AiJobResult | null) => void
}

export const useAiJobResults = (props: UseAiJobResultsProps) => {
  const {client} = props
  const [actionMessage, setActionMessage] = createSignal<string | null>(null)
  const [artifactDeleted, setArtifactDeleted] = createSignal(false)
  const [isDeleting, setIsDeleting] = createSignal(false)
  const [isRefreshingResult, setIsRefreshingResult] = createSignal(false)
  const [isSaving, setIsSaving] = createSignal(false)
  const {loadResult, speakResult} = createAiJobOutput({
    client,
    onComplete: (text) => props.onComplete(text),
    onError: (message) => props.onError(message),
    onResult: (result) => {
      props.onResult(result)
      setArtifactDeleted(false)
    },
    result: props.result,
    session: props.session,
  })
  const reset = () => {
    setActionMessage(null)
    setArtifactDeleted(false)
  }
  const refreshResult = async (): Promise<boolean> => {
    const currentJob = props.job()
    if (currentJob === null || currentJob.status !== 'succeeded' || artifactDeleted()) {
      return false
    }

    const revision = props.session.begin()
    setIsRefreshingResult(true)
    try {
      const result = await client.getJobResult(currentJob.id)
      if (!props.session.isCurrent(revision)) {
        return false
      }
      props.onResult(result)
      setArtifactDeleted(false)
      return true
    } catch (error: unknown) {
      if (!props.session.isCurrent(revision)) {
        return false
      }
      props.onError(
        getClientErrorCode(error) === 'ai_artifact_not_available'
          ? '결과 보관 기간이 지났거나 결과를 더 이상 열 수 없어요.'
          : '결과를 다시 열지 못했어요. 잠시 후 다시 시도해 주세요.',
      )
      return false
    } finally {
      if (props.session.isCurrent(revision)) {
        setIsRefreshingResult(false)
      }
    }
  }
  const saveArtifact = async (): Promise<boolean> => {
    const currentJob = props.job()
    if (currentJob === null || props.result()?.artifact === undefined) {
      return false
    }

    const revision = props.session.begin()
    setIsSaving(true)
    try {
      const result = await client.saveJobArtifact(currentJob.id)
      if (!props.session.isCurrent(revision)) {
        return false
      }
      props.onResult(result)
      setArtifactDeleted(false)
      setActionMessage('결과를 저장했어요. 저장한 결과는 직접 삭제할 때까지 보관됩니다.')
      return true
    } catch (error: unknown) {
      if (props.session.isCurrent(revision)) {
        props.onError(
          getClientErrorCode(error) === 'ai_artifact_not_available'
            ? '결과가 만료되어 저장할 수 없어요.'
            : '결과를 저장하지 못했어요. 다시 시도해 주세요.',
        )
      }
      return false
    } finally {
      if (props.session.isCurrent(revision)) {
        setIsSaving(false)
      }
    }
  }
  const deleteArtifact = async (): Promise<boolean> => {
    const currentJob = props.job()
    if (currentJob === null || props.result()?.artifact === undefined) {
      return false
    }

    const revision = props.session.begin()
    setIsDeleting(true)
    try {
      const result: AiJobArtifactDeleteResult = await client.deleteJobArtifact(currentJob.id)
      if (!props.session.isCurrent(revision)) {
        return false
      }
      const currentResult = props.result()
      props.onResult(currentResult?.text === undefined ? null : {text: currentResult.text})
      setArtifactDeleted(true)
      setActionMessage(
        result.deletionPending
          ? '삭제를 접수했어요. 저장소 정리 작업이 이어집니다.'
          : '결과를 삭제했어요.',
      )
      return true
    } catch (error: unknown) {
      if (props.session.isCurrent(revision)) {
        props.onError('결과를 삭제하지 못했어요. 다시 시도해 주세요.')
      }
      return false
    } finally {
      if (props.session.isCurrent(revision)) {
        setIsDeleting(false)
      }
    }
  }

  return {
    actionMessage,
    artifactDeleted,
    deleteArtifact,
    isDeleting,
    isRefreshingResult,
    isSaving,
    loadResult,
    refreshResult,
    reset,
    saveArtifact,
    speakResult,
  }
}
