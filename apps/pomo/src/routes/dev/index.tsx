import {lazy} from 'solid-js'

const HomePage = import.meta.env.DEV
  ? lazy(() => import('src/components/dev/HomePage'))
  : () => null

export default HomePage
