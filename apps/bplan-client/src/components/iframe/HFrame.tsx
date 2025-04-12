import {createEffect, createMemo, createSignal, JSX, splitProps, untrack} from 'solid-js'
import {getWindow} from '@winter-love/utils'
import {useEvent} from '@winter-love/solid-use'
import {createMessage, getMessage} from './utils'

export interface MessageProtocol {
  id: string
  message: string
}

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
