import {lazy} from 'solid-js'

const DialoguePage = import.meta.env.DEV
  ? lazy(() => import('src/components/dev/DialoguePage'))
  : () => null

export default DialoguePage
