import {localizeMessage, text as uiText} from '../features/localization'

import {createMemo, createSignal, type JSX, onCleanup, Show, untrack} from 'solid-js'
import {useDictation, useMicrophoneShortcut, useVoiceConversation} from '../features/dictation'
import {SMicrophoneButton} from './SMicrophoneButton'
import {SSpeechSendButton} from './SSpeechSendButton'
const COMPOSITION_KEY_CODE = 229
const MAXIMUM_LENGTH = 4000

const handleKeyDown: JSX.EventHandler<HTMLFormElement, KeyboardEvent> = (event) => {
  if (
    event.key === 'Enter' &&
    (event.ctrlKey || event.metaKey) &&
    !event.altKey &&
    !event.shiftKey &&
    !event.defaultPrevented &&
    !event.isComposing &&
    event.keyCode !== COMPOSITION_KEY_CODE
  ) {
    event.preventDefault()
    if (!event.repeat) {
      event.currentTarget.requestSubmit()
    }
  }
}

interface SSpeechComposerProps {
  readonly value?: string
  readonly label?: string
  readonly inputLabel?: string
  readonly placeholder?: string
  readonly disabled?: boolean
  readonly active?: boolean
  readonly error?: string | null
  readonly onEdit?: (value: string) => void
  readonly onSend?: () => void | Promise<void>
  readonly onRecording?: (active: boolean) => void
  readonly continuous?: boolean
  readonly voiceBusy?: boolean
  /** Ends reply generation and narration on microphone takeover; omission leaves external work unchanged. */
  readonly onInterrupt?: () => void
}
export const SSpeechComposer = (props: SSpeechComposerProps) => {
  const [draft, setDraft] = createSignal('')
  const [input, setInput] = createSignal<HTMLTextAreaElement | null>(null)
  const [finishing, setFinishing] = createSignal(false)
  let disposed = false
  onCleanup(() => {
    disposed = true
  })
  const value = () => props.value ?? draft()
  const edit = (text: string) => {
    setDraft(text)
    props.onEdit?.(text)
  }
  const handleText = (text: string) =>
    edit([value().trimEnd(), text].filter(Boolean).join(' ').slice(0, MAXIMUM_LENGTH))
  const sendVoice = async (text: string) => {
    handleText(text)
    await props.onSend?.()
    if (props.error) {
      throw new Error(props.error)
    }
  }
  const onRecording = (active: boolean) => {
    props.onRecording?.(active)
    const field = input()
    if (
      active &&
      props.continuous &&
      field?.ownerDocument.hasFocus() &&
      field.ownerDocument.activeElement === field.ownerDocument.body
    ) {
      field.focus({preventScroll: true})
    }
  }
  const dictation = untrack(() => props.continuous)
    ? useVoiceConversation({
        enabled: () => props.active !== false,
        onActive: onRecording,
        onInterrupt: () => props.onInterrupt?.(),
        onSend: sendVoice,
        paused: () => props.disabled === true || props.voiceBusy === true,
      })
    : useDictation({
        enabled: () => props.active !== false && !props.disabled,
        onActive: onRecording,
        onText: handleText,
      })
  const capturing = createMemo(() => {
    const state = dictation.state()
    return state !== 'idle' && state !== 'waiting'
  })
  const sendingBlocked = () => finishing() || props.disabled || (props.continuous && capturing())
  const microphoneDisabled = () => finishing() || (!props.continuous && props.disabled)
  useMicrophoneShortcut({
    enabled: () => props.active !== false && !microphoneDisabled(),
    onToggle: () => (capturing() ? input()?.form?.requestSubmit() : dictation.toggle()),
  })
  const handleMicrophone = () => {
    dictation.toggle()
    input()?.focus({preventScroll: true})
  }
  const handleInput: JSX.EventHandler<HTMLTextAreaElement, InputEvent> = (event) => {
    if (props.continuous) {
      dictation.cancel()
    }
    edit(event.currentTarget.value)
  }
  const handleKeyboard: JSX.EventHandler<HTMLFormElement, KeyboardEvent> = (event) => {
    if (event.key === 'Escape') {
      dictation.cancel()
    } else {
      handleKeyDown(event)
    }
  }
  const handleSubmit = async (event: SubmitEvent) => {
    event.preventDefault()
    if (event.submitter === null && 'submit' in dictation && capturing()) {
      dictation.submit()
      return
    }
    if (sendingBlocked()) {
      return
    }
    if (event.submitter === null && 'finish' in dictation && capturing()) {
      setFinishing(true)
      const completed = await dictation.finish().finally(() => setFinishing(false))
      if (!completed) {
        return
      }
    }
    if (!disposed && props.active !== false && !sendingBlocked() && value().trim()) {
      await props.onSend?.()
    }
  }
  return (
    <form
      aria-label={props.label ?? uiText('캐릭터 대화 전송')}
      aria-keyshortcuts="Control+Enter Meta+Enter"
      class="grid shrink-0 gap-2 pt-1"
      classList={{invisible: props.active === false}}
      onSubmit={handleSubmit}
      onKeyDown={handleKeyboard}
    >
      <div
        role="group"
        aria-label={uiText('메시지 입력')}
        class="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-end gap-1 rounded-lg
        border border-solid border-stone-500/80 bg-white p-1
        focus-within:outline-solid focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-blue-700"
      >
        <textarea
          ref={setInput}
          aria-label={props.inputLabel ?? uiText('캐릭터에게 보낼 메시지')}
          aria-keyshortcuts="Control+Enter Meta+Enter"
          placeholder={props.placeholder ?? uiText('말 걸기')}
          rows={1}
          maxLength={MAXIMUM_LENGTH}
          disabled={props.disabled}
          class="box-border min-h-8 max-h-18 min-w-0 w-full resize-none appearance-none border-0
          bg-transparent px-1 py-1.5 [field-sizing:content]
          text-[13px] leading-5 text-stone-900 [font-family:inherit] placeholder:text-stone-500
          focus:outline-none disabled:opacity-50"
          value={value()}
          onInput={handleInput}
        />
        <div class="flex items-center justify-end gap-1">
          <SMicrophoneButton
            state={dictation.state()}
            continuous={props.continuous}
            level={dictation.level()}
            disabled={microphoneDisabled()}
            onClick={handleMicrophone}
          />
          <SSpeechSendButton disabled={sendingBlocked() || !value().trim()} />
        </div>
      </div>
      <Show when={props.error ?? dictation.error()}>
        {(error) => (
          <p role="alert" class="m-0 text-xs text-red-700">
            {localizeMessage(error() ?? '')}
          </p>
        )}
      </Show>
    </form>
  )
}
