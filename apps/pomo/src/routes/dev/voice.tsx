import {lazy} from 'solid-js'

const VoicePage = import.meta.env.DEV
  ? lazy(() => import('src/components/dev/VoicePage'))
  : () => null

export default VoicePage
