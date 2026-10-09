import {afterEach, describe, expect, it, vi} from 'vitest'
import {createPort, createViewerFixture, document, initial} from './fixtures/viewer'

describe('useViewer feedback', () => {
  const {mount, dispose} = createViewerFixture()
  afterEach(() => {
    dispose()
    vi.unstubAllGlobals()
  })
  it('should report a missing file separately from the selected address and dismiss the notice', async () => {
    const port = createPort()
    const viewer = mount(port)
    viewer.selectLines(4, 6)
    vi.mocked(port.call).mockResolvedValueOnce({
      content: [],
      isError: true,
      structuredContent: {code: 'not-found'},
    })
    await viewer.go(document('missing.tsx').location)
    expect(viewer.notice()?.message).toBe('파일을 찾을 수 없습니다.')
    expect(viewer.address()).toBe('main.tsx:4:1-6:1')
    await viewer.refresh()
    expect(viewer.notice()?.message).toBe('파일을 찾을 수 없습니다.')
    viewer.dismissNotice()
    expect(viewer.notice()).toBeNull()
    expect(viewer.address()).toBe('main.tsx:4:1-6:1')
  })

  it('should show unavailable definition feedback separately from the file address', async () => {
    const port = createPort()
    const viewer = mount(port)
    vi.mocked(port.call).mockResolvedValueOnce({content: [], structuredContent: {locations: []}})
    await viewer.follow({kind: 'identifier', navigation: 'definition', offset: 0, text: 'Missing'})
    expect(viewer.notice()?.message).toBe(
      '이동 대상이 없습니다. 작업 폴더 밖의 정의는 표시하지 않습니다.',
    )
    expect(viewer.address()).toBe('main.tsx:1:1')
  })

  it('should replace a save notice with a later missing-definition notice', async () => {
    const port = createPort()
    const viewer = mount(port)
    viewer.editing.change('saved draft')
    vi.mocked(port.call).mockResolvedValueOnce({
      content: [],
      structuredContent: {
        document: {...initial.document, revision: 'saved', source: 'saved draft'},
      },
    })
    await viewer.editing.save()
    expect(viewer.notice()?.message).toBe('저장했습니다.')
    vi.mocked(port.call).mockResolvedValueOnce({content: [], structuredContent: {locations: []}})
    await viewer.follow({kind: 'identifier', navigation: 'definition', offset: 0, text: 'Missing'})
    expect(viewer.notice()?.message).toBe(
      '이동 대상이 없습니다. 작업 폴더 밖의 정의는 표시하지 않습니다.',
    )
    viewer.editing.change('another draft')
    vi.mocked(port.call).mockResolvedValueOnce({
      content: [],
      structuredContent: {
        document: {...initial.document, revision: 'saved-again', source: 'another draft'},
      },
    })
    await viewer.editing.save()
    expect(viewer.notice()?.message).toBe('저장했습니다.')
  })

  it('should retain the latest notice and dismiss without restoring older feedback', async () => {
    const port = createPort()
    const viewer = mount(port)
    viewer.reportError(new Error('earlier failure'))
    vi.mocked(port.call).mockResolvedValueOnce({content: [], structuredContent: {locations: []}})
    await viewer.follow({kind: 'identifier', navigation: 'definition', offset: 0, text: 'Missing'})
    expect(viewer.notice()?.message).toBe(
      '이동 대상이 없습니다. 작업 폴더 밖의 정의는 표시하지 않습니다.',
    )
    viewer.reportError(new Error('latest failure'))
    expect(viewer.notice()?.message).toBe('latest failure')
    viewer.dismissNotice()
    expect(viewer.notice()).toBeNull()
    vi.mocked(port.call).mockResolvedValueOnce({content: [], structuredContent: {locations: []}})
    await viewer.follow({kind: 'identifier', navigation: 'definition', offset: 0, text: 'Missing'})
    viewer.dismissNotice()
    expect(viewer.notice()).toBeNull()
  })
})
