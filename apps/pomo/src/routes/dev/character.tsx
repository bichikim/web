import {lazy} from 'solid-js'

const CharacterPage = import.meta.env.DEV
  ? lazy(() => import('src/components/dev/CharacterPage'))
  : () => null

export default CharacterPage
