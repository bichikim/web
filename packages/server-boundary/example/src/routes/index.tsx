import {createResource} from 'solid-js'
import {getMessage} from '../server/functions/message'

export default function Home() {
  const [message] = createResource(getMessage)
  return <p>{message()}</p>
}
