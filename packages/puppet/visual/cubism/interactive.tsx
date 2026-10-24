import {render} from 'solid-js/web'
import {ComparisonPage} from './ComparisonPage'

const root = document.getElementById('comparison-root')
if (root === null) {
  throw new Error('비교 화면의 루트가 없습니다.')
}
render(() => <ComparisonPage />, root)
