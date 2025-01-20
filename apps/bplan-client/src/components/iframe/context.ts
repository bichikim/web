import {Accessor, createContext} from 'solid-js'

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
