import {lazy} from 'solid-js'

const TextMoodPage = import.meta.env.DEV
  ? lazy(() => import('src/components/dev/TextMoodPage'))
  : () => null

export default TextMoodPage
