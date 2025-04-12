import {createEffect, createSignal, JSX, Show, untrack} from 'solid-js'
import {getWindow} from '@winter-love/utils'
import {useEvent} from '@winter-love/solid-use'
import {createMessage, getMessage} from './utils'
import {IframeContentMessage} from './context'

export interface HFrameContentProps extends JSX.HTMLAttributes<HTMLDivElement> {
  /**
   * not reactive
   */
  initMessage?: string

  onMessage?: (message: string) => void
}

export function HFrameContent(props: HFrameContentProps) {
  const initMessage = untrack(() => props.initMessage)
  const [message, setMessage] = createSignal<string | undefined>(initMessage)
  const [isClient, setIsClient] = createSignal(false)

  const handleMessage = (event: MessageEvent) => {
    const {data} = event
    const message = getMessage(data)

    if (message !== undefined) {
      setMessage(message)
      props.onMessage?.(message)
    }
  }

  createEffect(() => {
    setIsClient(true)
  })
  useEvent(getWindow(), 'message', handleMessage)

  const handleSendMessage = (message: string) => {
    const window = getWindow()

    if (!window) {
      return
    }

    window.parent.postMessage(createMessage(message), '*')
  }

  return (
    <IframeContentMessage.Provider value={{message, sendMessage: handleSendMessage}}>
      <Show when={isClient()}>{props.children}</Show>
    </IframeContentMessage.Provider>
  )
}
