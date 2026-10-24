import {onCleanup} from 'solid-js'
import {render} from 'solid-js/web'
import {EditorButton} from '../../src/design-system'
import {ComparisonPage} from './ComparisonPage'
import {embedded} from './embedded-data'

const download = (url: string, filename: string) => {
  const anchor = globalThis.document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
}

const Downloads = () => {
  const data = embedded()
  const archive = URL.createObjectURL(
    new Blob([data.archive.slice().buffer], {type: 'application/zip'}),
  )
  const document = URL.createObjectURL(new Blob([data.document], {type: 'application/json'}))
  const notices = URL.createObjectURL(new Blob([data.notices], {type: 'text/plain;charset=utf-8'}))
  onCleanup(() => [archive, document, notices].forEach((url) => URL.revokeObjectURL(url)))
  return (
    <>
      <EditorButton onClick={() => download(archive, 'Hiyori.zip')}>Cubism ZIP</EditorButton>
      <EditorButton onClick={() => download(document, 'poffo.json')}>poffo.json</EditorButton>
      <EditorButton onClick={() => download(notices, 'NOTICES.txt')}>라이선스</EditorButton>
    </>
  )
}

const root = document.getElementById('comparison-root')
if (root === null) {
  throw new Error('비교 화면의 루트가 없습니다.')
}
render(
  () => (
    <ComparisonPage>
      <Downloads />
    </ComparisonPage>
  ),
  root,
)
