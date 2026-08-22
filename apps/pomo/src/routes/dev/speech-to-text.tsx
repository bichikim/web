import {lazy} from 'solid-js'

const SpeechToTextPage = import.meta.env.DEV
  ? lazy(() => import('src/components/dev/SpeechToTextPage'))
  : () => null

export default SpeechToTextPage
