import {type Accessor, onCleanup} from 'solid-js'

import {createCalendarToolClock} from 'src/features/calendar/agent-tool-contract'
import type {ChatController} from 'src/features/chat'
import type {SpeechToTextController} from 'src/features/speech-to-text'

export interface UseSendProps {
  readonly chat: Pick<ChatController, 'canSend' | 'send'>
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
  let disposed = false
  let sendRevision = 0

  onCleanup(() => {
    disposed = true
  })

  const sendDraft = () => {
    if (disposed || !props.chat.canSend()) {
      return
    }

    props.onSendStarted()
    props.chat.send({calendarTool: createCalendarToolClock(), refineAnswer: props.refineAnswer()})
  }
  const stopSpeechAndSend = async () => {
    const submittedRevision = sendRevision

    try {
      await props.speech.stopRecording()

      if (submittedRevision === sendRevision) {
        sendDraft()
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
      sendDraft()
    }
  }

  const invalidate = () => {
    sendRevision += 1
  }

  return {invalidate, send}
}
