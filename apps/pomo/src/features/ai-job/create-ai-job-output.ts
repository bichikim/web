import type {Accessor} from 'solid-js'
import type {AiJobClient} from './client'
import type {AiJob, AiJobResult} from './contracts'
import type {AiJobSession} from './create-ai-job-session'
import {getClientErrorCode} from './status'

export interface AiJobOutputOptions {
  readonly client: AiJobClient
  readonly result: Accessor<AiJobResult | null>
  readonly session: AiJobSession
  readonly onComplete: (text: string) => Promise<void>
  readonly onError: (message: string) => void
  readonly onResult: (result: AiJobResult | null) => void
}

export const createAiJobOutput = (props: AiJobOutputOptions) => {
  let handledCompletionJobId: string | null = null
  const speakText = async (text: string, revision: number): Promise<boolean> => {
    try {
      await props.onComplete(text)
      return props.session.isCurrent(revision)
    } catch (error: unknown) {
      if (props.session.isCurrent(revision)) {
        props.onError('음성을 재생하지 못했어요.')
      }
      console.error('Failed to speak the server AI reply.', error)
      return false
    }
  }
  const loadResult = async (
    nextJob: AiJob,
    revision: number,
    shouldSpeak: boolean,
  ): Promise<boolean> => {
    const speakOnce = shouldSpeak && handledCompletionJobId !== nextJob.id
    let {result} = nextJob
    try {
      result = await props.client.getJobResult(nextJob.id)
    } catch (error: unknown) {
      if (!props.session.isCurrent(revision)) {
        return false
      }

      if (result?.text !== undefined && speakOnce) {
        await speakText(result.text, revision)
      }
      props.onError(
        getClientErrorCode(error) === 'ai_artifact_not_available'
          ? '결과 보관 기간이 지났거나 결과를 더 이상 열 수 없어요.'
          : '완료된 결과를 열지 못했어요. 다시 열기를 눌러 주세요.',
      )
      return false
    }

    if (!props.session.isCurrent(revision)) {
      return false
    }

    props.onResult(result)
    if (speakOnce && result.text !== undefined) {
      handledCompletionJobId = nextJob.id
      return speakText(result.text, revision)
    }
    return true
  }
  const speakResult = async (): Promise<boolean> => {
    const text = props.result()?.text
    if (text === undefined) {
      return false
    }
    const revision = props.session.begin()
    return speakText(text, revision)
  }

  return {loadResult, speakResult}
}
