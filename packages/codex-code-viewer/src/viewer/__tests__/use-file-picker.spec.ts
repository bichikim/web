import {createRoot, createSignal} from 'solid-js'
import {afterEach, describe, expect, it, vi} from 'vitest'
import {useFilePicker} from '../use-file-picker'

describe('useFilePicker', () => {
  let dispose: () => void
  const onFind = vi.fn()
  const onOpen = vi.fn()
  const [files, setFiles] = createSignal(['src/main.tsx', 'src/editor.tsx'])
  const [finding, setFinding] = createSignal(false)
  const mount = (searchable = true) =>
    createRoot((cleanup) => {
      dispose = cleanup
      return useFilePicker({
        busy: () => false,
        files,
        finding,
        onFind,
        onOpen,
        searchable: () => searchable,
      })
    })
  afterEach(() => {
    dispose()
    vi.clearAllMocks()
    setFinding(false)
    setFiles(['src/main.tsx', 'src/editor.tsx'])
  })

  it('should open an absolute path before any file is loaded without searching', () => {
    const picker = mount(false)
    picker.change('/project/src/main.tsx:8:2')
    picker.submit()
    expect(onFind).not.toHaveBeenCalled()
    expect(onOpen).toHaveBeenCalledWith(
      {column: 2, line: 8, path: '/project/src/main.tsx'},
      {restoreView: false},
    )
  })

  it('should open an embedded relative address directly rather than search it', () => {
    const picker = mount()
    picker.change('위치: src/editor.tsx:9')
    picker.submit()
    expect(onFind).not.toHaveBeenCalled()
    expect(onOpen).toHaveBeenCalledWith(
      {column: 1, line: 9, path: 'src/editor.tsx'},
      {restoreView: false},
    )
  })

  it('should distinguish a plain path from an explicit first-line address', () => {
    const picker = mount()
    picker.change('src/main.tsx')
    picker.submit()
    expect(onOpen).toHaveBeenLastCalledWith(
      {column: 1, line: 1, path: 'src/main.tsx'},
      {restoreView: true},
    )
    picker.change('src/main.tsx:1:1')
    picker.submit()
    expect(onOpen).toHaveBeenLastCalledWith(
      {column: 1, line: 1, path: 'src/main.tsx'},
      {restoreView: false},
    )
  })

  it('should search a keyword without opening the first result on submit', () => {
    const picker = mount()
    picker.change('editor')
    picker.submit()
    expect(onFind).toHaveBeenCalledWith('editor')
    expect(picker.expanded()).toBe(true)
    expect(onOpen).not.toHaveBeenCalled()
  })

  it('should open the explicitly chosen keyboard result and dismiss the list', () => {
    const picker = mount()
    picker.change('src')
    picker.move(1)
    picker.move(1)
    picker.submit()
    expect(onOpen).toHaveBeenCalledWith(
      {column: 1, line: 1, path: 'src/editor.tsx'},
      {restoreView: true},
    )
    expect(picker.expanded()).toBe(false)
  })

  it('should avoid opening old results while a new search is pending', () => {
    const picker = mount()
    picker.change('main')
    picker.move(1)
    setFinding(true)
    picker.change('missing')
    picker.submit()
    expect(onOpen).not.toHaveBeenCalled()
    setFiles([])
    setFinding(false)
    expect(picker.activePath()).toBeNull()
  })

  it('should retain the input when dismissing search results', () => {
    const picker = mount()
    picker.change('editor')
    picker.dismiss()
    expect(picker.query()).toBe('editor')
    expect(picker.expanded()).toBe(false)
    expect(onOpen).not.toHaveBeenCalled()
  })
})
