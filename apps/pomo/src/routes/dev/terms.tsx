import {lazy} from 'solid-js'

const TermsPage = import.meta.env.DEV
  ? lazy(() => import('src/components/dev/TermsPage'))
  : () => null

export default TermsPage
