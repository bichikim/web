import {lazy} from 'solid-js'

const LayerReviewPage = import.meta.env.DEV
  ? lazy(() => import('src/components/dev/LayerReviewPage'))
  : () => null

export default LayerReviewPage
