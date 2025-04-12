import {IframeContentMessage} from 'src/components/iframe'
import {createEffect, useContext} from 'solid-js'

export interface ProcessProps {
  /**
   * 피아노 mp3 파일 blob url
   */
  file: string
}

/**
 * Ai 를 이용하여 피아노 mp3 를 midi 파일로 변환하는 컴포넌트
 */
export function Process() {
  const {message, sendMessage} = useContext(IframeContentMessage)

  const handleSendMessage = () => {
    sendMessage('hello')
  }

  createEffect(() => {
    console.info('message from parent', message())
  })

  return (
    <div>
      <button onClick={handleSendMessage}>Send Message</button>
    </div>
  )
}
