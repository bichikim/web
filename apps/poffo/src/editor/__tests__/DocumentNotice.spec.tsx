/** @vitest-environment jsdom */
import {cleanup, fireEvent, render, screen} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, expect, test, vi} from 'vitest'
import {createEmptyDocument, serializePoffoDocument} from '@winter-love/puppet/player'
import {DocumentNotice} from '../DocumentNotice'
import {useDocumentExport} from '../use-document-export'

vi.mock('@winter-love/puppet/player', async (original) => ({
  ...(await original<typeof import('@winter-love/puppet/player')>()),
  serializePoffoDocument: vi.fn(),
}))

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

test('should prioritize a local notice and dismiss it together with export feedback', async () => {
  vi.mocked(serializePoffoDocument).mockRejectedValueOnce(new Error('export failed'))
  vi.spyOn(console, 'warn').mockImplementation(() => undefined)
  let exporting!: ReturnType<typeof useDocumentExport>
  render(() => {
    const [message, setMessage] = createSignal<string | null>('다른 파일 작업 안내')
    exporting = useDocumentExport(createEmptyDocument)
    return (
      <DocumentNotice
        exporting={exporting}
        message={message()}
        onDismiss={() => setMessage(null)}
      />
    )
  })
  await exporting.exportPoffoDocument()
  expect(exporting.notice()).toBe('문서를 저장하지 못했습니다.')
  expect(screen.getByRole('alert')).toHaveTextContent('다른 파일 작업 안내')
  fireEvent.click(screen.getByRole('button', {name: '알림 닫기'}))
  expect(exporting.notice()).toBeNull()
  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
})

test.each(['json', 'poffo'])(
  'should describe and dismiss omitted temporary changes for %s export',
  async (format) => {
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:json')
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined)
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined)
    let exporting!: ReturnType<typeof useDocumentExport>
    render(() => {
      exporting = useDocumentExport(createEmptyDocument, () => true)
      return <DocumentNotice exporting={exporting} />
    })
    if (format === 'json') {
      exporting.exportDocument()
    } else {
      vi.mocked(serializePoffoDocument).mockResolvedValueOnce(new Blob(['native']))
      await exporting.exportPoffoDocument()
    }
    expect(screen.getByRole('alert')).toHaveTextContent(
      '내보낸 문서에는 임시 변경이 포함되지 않았습니다.',
    )
    fireEvent.click(screen.getByRole('button', {name: '알림 닫기'}))
    expect(exporting.omitsTemporary()).toBe(false)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  },
)

test('should dismiss the current export state when its controller prop changes', async () => {
  vi.mocked(serializePoffoDocument)
    .mockRejectedValueOnce(new Error('first failed'))
    .mockRejectedValueOnce(new Error('second failed'))
  vi.spyOn(console, 'warn').mockImplementation(() => undefined)
  let first!: ReturnType<typeof useDocumentExport>
  let second!: ReturnType<typeof useDocumentExport>
  let selectSecond!: () => void
  render(() => {
    first = useDocumentExport(createEmptyDocument)
    second = useDocumentExport(createEmptyDocument)
    const [selected, setSelected] = createSignal(first)
    selectSecond = () => setSelected(second)
    return <DocumentNotice exporting={selected()} />
  })
  await first.exportPoffoDocument()
  await second.exportPoffoDocument()
  selectSecond()
  fireEvent.click(screen.getByRole('button', {name: '알림 닫기'}))
  expect(second.notice()).toBeNull()
  expect(first.notice()).toBe('문서를 저장하지 못했습니다.')
  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
})
