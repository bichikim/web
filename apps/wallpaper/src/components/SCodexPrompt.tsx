import {text as uiText} from '../features/localization'
import {Show} from 'solid-js'
import {type CodexPort, usePromptSend} from '../features/codex'
import {SSpeechComposer} from './SSpeechComposer'

interface SCodexPromptProps {
  readonly sessionId: string
  readonly notificationId?: number
  readonly active?: boolean
  readonly onRecording?: (active: boolean) => void
  readonly onSend?: CodexPort['sendPrompt']
}
export const SCodexPrompt = (props: SCodexPromptProps) => {
  const prompt = usePromptSend({
    notificationId: () => props.notificationId,
    send: () => props.onSend,
    sessionId: () => props.sessionId,
  })
  return (
    <Show when={prompt.visible()}>
      <SSpeechComposer
        label={uiText('Codex 프롬프트 전송')}
        inputLabel={uiText('Codex에 보낼 메시지')}
        placeholder={uiText('다음 요청')}
        value={prompt.draft()}
        disabled={prompt.busy()}
        active={props.active}
        onRecording={props.onRecording}
        onEdit={prompt.edit}
        onSend={prompt.send}
        error={prompt.error()}
      />
    </Show>
  )
}
