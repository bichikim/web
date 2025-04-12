import {createSignal} from 'solid-js'
import {HFrame} from 'src/components/iframe'

export default function IframeTest() {
  const [message, setMessage] = createSignal('')

  const handleChangeMessage = () => {
    setMessage((message) => `${message} 1`)
  }

  // eslint-disable-next-line unicorn/consistent-function-scoping
  const handleIFrameMessage = (message: string) => {
    console.info('child to parent', message)
  }

  return (
    <main>
      <button onClick={handleChangeMessage} class="fixed top-0 right-0">
        change child Message
      </button>
      <HFrame
        class="fixed bottom-0 left-0 w-500px h-500px m-0 b-0"
        message={message()}
        onMessage={handleIFrameMessage}
      />
    </main>
  )
}
