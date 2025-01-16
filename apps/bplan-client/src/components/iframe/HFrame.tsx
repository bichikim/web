import {
  Accessor,
  createContext,
  createEffect,
  createMemo,
  createSignal,
  JSX,
  Show,
  splitProps,
  untrack,
} from 'solid-js'
import {getWindow} from '@winter-love/utils'
import {useEvent} from '@winter-love/solid-use'

export interface MessageProtocol {
  id: string
  message: string
}

const MESSAGE_TYPE = 'iframe-message'

export interface HFrameProps extends JSX.IframeHTMLAttributes<HTMLIFrameElement> {
  message?: string
  onLoad?: JSX.EventHandlerUnion<HTMLIFrameElement, Event>
  onMessage?: (message: string) => void
  /**
   * not reactive
   */
  targetId?: string
}

const SUB_PROCESS_TARGET_URL = 'sub-process'

const createMessage = (message: string) => ({
  message,
  type: MESSAGE_TYPE,
})

const getMessage = (data: any) => {
  if (typeof data === 'object' && data.type === MESSAGE_TYPE) {
    return data.message
  }
}

export function HFrame(props: HFrameProps) {
  const targetId = untrack(() => props.targetId ?? 'default')
  const [innerProps, restProps] = splitProps(props, [
    'onMessage',
    'onLoad',
    'onMessage',
    'message',
  ])
  const [iframeRef, setIframeRef] = createSignal<HTMLIFrameElement>()

  const handleMessage = (event: MessageEvent) => {
    const {data} = event

    const message = getMessage(data)

    if (message !== undefined) {
      innerProps.onMessage?.(message)
    }
  }

  const handlePostMessage = (message: string) => {
    const iframe = iframeRef()

    if (!iframe?.contentWindow) {
      return
    }

    iframe.contentWindow.postMessage(createMessage(message), '*')
  }

  createEffect(() => {
    const _message = innerProps.message

    untrack(() => {
      if (_message) {
        handlePostMessage(_message)
      }
    })
  })
  useEvent(getWindow(), 'message', handleMessage)

  const iframeSource = createMemo(() => {
    return `/${SUB_PROCESS_TARGET_URL}/${targetId}`
  })

  return (
    <iframe
      {...restProps}
      ref={setIframeRef}
      src={iframeSource()}
      onLoad={innerProps.onLoad}
    />
  )
}

export interface HFrameContentProps extends JSX.HTMLAttributes<HTMLDivElement> {
  /**
   * not reactive
   */
  initMessage?: string

  onMessage?: (message: string) => void
}

export interface IframeContentMessageProps {
  message: Accessor<string | undefined>
  sendMessage: (message: string) => void
}

export const IframeContentMessage = createContext<IframeContentMessageProps>({
  message: (): string | undefined => {
    // empty
    return undefined
  },
  /**
   * fake empty default sendMessage
   */
  sendMessage: () => {
    // empty
  },
})

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
