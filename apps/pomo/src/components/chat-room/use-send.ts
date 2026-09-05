import {type Accessor, onCleanup} from 'solid-js'

import {loadCalendarPromptContext} from 'src/features/calendar'
import type {ChatController} from 'src/features/chat'
import type {SpeechToTextController} from 'src/features/speech-to-text'

export interface UseSendProps {
  readonly chat: Pick<ChatController, 'canSend' | 'draft' | 'send'>
  readonly onSendStarted: () => void
  readonly refineAnswer: Accessor<boolean>
  readonly speech: Pick<SpeechToTextController, 'activity' | 'stopRecording'>
}

export interface SendController {
  readonly invalidate: () => void
  readonly send: () => Promise<void>
}

/** Owns pending sends within the current Solid owner; borrows chat and speech controllers. */
export const useSend = (props: UseSendProps): SendController => {
  let calendarRequestPending = false
  let disposed = false
  let sendRevision = 0

  onCleanup(() => {
    disposed = true
  })

  const sendDraft = async () => {
    if (disposed || !props.chat.canSend() || calendarRequestPending) {
      return
    }

    const submittedRevision = sendRevision
    const submittedDraft = props.chat.draft()
    calendarRequestPending = true
    props.onSendStarted()
    let supplementaryContext: string | null = null

    try {
      supplementaryContext = await loadCalendarPromptContext({text: submittedDraft})
    } catch (error: unknown) {
      if (disposed || submittedRevision !== sendRevision) {
        return
      }

      console.error('Failed to load calendar context for chat', error)
      supplementaryContext =
        '캘린더 일정을 조회하지 못했습니다. 일정을 추측하지 말고 현재 조회할 수 없다고 안내하세요.'
    } finally {
      calendarRequestPending = false
    }

    if (
      disposed ||
      submittedRevision !== sendRevision ||
      !props.chat.canSend() ||
      props.chat.draft() !== submittedDraft
    ) {
      return
    }

    props.chat.send({
      refineAnswer: props.refineAnswer(),
      ...(supplementaryContext === null ? {} : {supplementaryContext}),
    })
  }
  const stopSpeechAndSend = async () => {
    const submittedRevision = sendRevision

    try {
      await props.speech.stopRecording()

      if (submittedRevision === sendRevision) {
        await sendDraft()
      }
    } catch (error: unknown) {
      console.error(error)
    }
  }
  const send = async () => {
    const speechActivity = props.speech.activity()

    if (speechActivity === 'recording') {
      await stopSpeechAndSend()
      return
    }

    if (speechActivity === 'idle') {
      await sendDraft()
    }
  }

  const invalidate = () => {
    sendRevision += 1
  }

  return {invalidate, send}
}
