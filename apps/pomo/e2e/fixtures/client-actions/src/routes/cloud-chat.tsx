import {createSignal, For, onMount, Show} from 'solid-js'
import {useChat} from '../../../../../src/features/chat'

export default function CloudChat() {
  const chat = useChat({modelId: 'cloud'})
  const [mounted, setMounted] = createSignal(false)
  onMount(() => setMounted(true))
  const handleSubmit = (event: SubmitEvent) => {
    event.preventDefault()
    chat.send()
  }

  return (
    <main>
      <button disabled={!mounted() || !chat.canPrepare()} onClick={chat.prepare} type="button">
        Prepare cloud chat
      </button>
      <form onSubmit={handleSubmit}>
        <label>
          Chat message
          <textarea
            disabled={!chat.isModelReady()}
            value={chat.draft()}
            onInput={(event) => chat.setDraft(event.currentTarget.value)}
          />
        </label>
        <button disabled={!chat.canSend()} type="submit">
          Send
        </button>
      </form>
      <ol aria-label="Conversation">
        <For each={chat.messages()}>{(message) => <li>{message.content}</li>}</For>
      </ol>
      <Show when={chat.state().status === 'error'}>
        <p role="alert">{chat.statusMessage()}</p>
      </Show>
    </main>
  )
}
