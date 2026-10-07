/** @vitest-environment jsdom */
import {cleanup, fireEvent, render, screen, waitFor} from '@solidjs/testing-library'
import {createRoot, createSignal} from 'solid-js'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {createDocument} from '../pdf/create-document'
import {SPdfDocument} from '../SPdfDocument'
import {ViewStateContext} from '../view-state/context'
import {useSessionViewState} from '../use-session-view-state'
import type {PdfDocument, PdfLoad} from '../pdf/types'

vi.mock('../pdf/create-document', () => ({createDocument: vi.fn()}))

describe('SPdfDocument', () => {
  let disposeState: (() => void) | undefined
  const draw = vi.fn()
  const destroy = vi.fn()
  const page = vi.fn()
  const text = vi.fn()
  const document: PdfDocument = {page, pages: 3, text}
  const loading: PdfLoad = {destroy, result: Promise.resolve(document)}
  beforeEach(() => {
    text.mockImplementation(async (number: number) =>
      number === 1 ? 'First alpha' : number === 2 ? 'Second alpha' : '',
    )
    draw.mockReturnValue({cancel: vi.fn(), result: Promise.resolve()})
    page.mockResolvedValue({
      height: 800,
      render: draw,
      text: vi.fn().mockResolvedValue({offsets: [], runs: [], source: ''}),
      width: 600,
    })
    vi.mocked(createDocument).mockReturnValue(loading)
  })
  afterEach(() => {
    cleanup()
    disposeState?.()
    disposeState = undefined
    vi.restoreAllMocks()
    vi.clearAllMocks()
    vi.unstubAllGlobals()
  })

  it('should capture Cmd/Ctrl+F and navigate document-wide search results', async () => {
    render(() => <SPdfDocument blob={new Blob()} path="guide.pdf" />)
    await screen.findByText('/ 3')
    const shortcut = new KeyboardEvent('keydown', {
      bubbles: true,
      cancelable: true,
      key: 'f',
      metaKey: true,
    })
    globalThis.dispatchEvent(shortcut)
    expect(shortcut.defaultPrevented).toBe(true)
    const input = screen.getByRole<HTMLInputElement>('textbox', {name: '파일 내 검색어'})
    expect(globalThis.document.activeElement).toBe(input)
    fireEvent.input(input, {target: {value: 'alpha'}})
    await screen.findByText('1/2')
    fireEvent.keyDown(input, {key: 'Enter'})
    expect(screen.getByRole<HTMLInputElement>('spinbutton', {name: 'PDF 페이지'}).value).toBe('2')
    expect(screen.getByText('2/2')).toBeTruthy()
    fireEvent.keyDown(input, {key: 'Enter', shiftKey: true})
    expect(screen.getByRole<HTMLInputElement>('spinbutton', {name: 'PDF 페이지'}).value).toBe('1')
    fireEvent.keyDown(input, {key: 'Escape'})
    expect(screen.queryByRole('textbox', {name: '파일 내 검색어'})).toBeNull()
    expect(globalThis.document.activeElement).toBe(screen.getByLabelText('PDF 페이지 보기'))
    fireEvent.click(screen.getByRole('button', {name: 'PDF 텍스트 검색'}))
    expect(screen.getByRole<HTMLInputElement>('textbox', {name: '파일 내 검색어'}).value).toBe(
      'alpha',
    )
    expect(text).toHaveBeenCalledTimes(3)
  })
  it('should remove its shortcut handler when leaving the PDF', async () => {
    const view = render(() => <SPdfDocument blob={new Blob()} path="guide.pdf" />)
    await screen.findByText('/ 3')
    view.unmount()
    const shortcut = new KeyboardEvent('keydown', {cancelable: true, ctrlKey: true, key: 'f'})
    globalThis.dispatchEvent(shortcut)
    expect(shortcut.defaultPrevented).toBe(false)
  })
  it('should restore page and manual zoom and clamp the page after the PDF becomes shorter', async () => {
    const state = createRoot((dispose) => {
      disposeState = dispose
      return useSessionViewState({
        selection: () => null,
        session: () => ({
          document: {
            lines: [],
            location: {column: 1, line: 1, path: 'guide.pdf'},
            revision: 'one',
            source: '',
          },
          session: 'one',
          workspace: '/project',
        }),
      })
    })
    const mount = () =>
      render(() => (
        <ViewStateContext.Provider value={state}>
          <SPdfDocument blob={new Blob()} path="guide.pdf" />
        </ViewStateContext.Provider>
      ))
    const first = mount()
    await screen.findByText('/ 3')
    const input = screen.getByRole<HTMLInputElement>('spinbutton', {name: 'PDF 페이지'})
    fireEvent.input(input, {target: {value: '3'}})
    fireEvent.blur(input)
    const zoom = screen.getByRole<HTMLInputElement>('spinbutton', {name: 'PDF 배율 (%)'})
    fireEvent.input(zoom, {target: {value: '150'}})
    fireEvent.blur(zoom)
    first.unmount()
    vi.mocked(createDocument).mockReturnValueOnce({
      destroy,
      result: Promise.resolve({...document, pages: 2}),
    })
    mount()
    await screen.findByText('/ 2')
    expect(screen.getByRole<HTMLInputElement>('spinbutton', {name: 'PDF 페이지'}).value).toBe('2')
    expect(screen.getByRole<HTMLInputElement>('spinbutton', {name: 'PDF 배율 (%)'}).value).toBe(
      '150',
    )
    expect(page).toHaveBeenLastCalledWith(2)
  })

  it('should retain fit mode and recalculate zoom for the current viewport', async () => {
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(632)
    const state = createRoot((dispose) => {
      disposeState = dispose
      return useSessionViewState({
        selection: () => null,
        session: () => ({
          document: {
            lines: [],
            location: {column: 1, line: 1, path: 'guide.pdf'},
            revision: 'one',
            source: '',
          },
          session: 'one',
          workspace: '/project',
        }),
      })
    })
    state.bind()?.update({pdf: {fitting: true, page: 2, percent: 150}})
    render(() => (
      <ViewStateContext.Provider value={state}>
        <SPdfDocument blob={new Blob()} path="guide.pdf" />
      </ViewStateContext.Provider>
    ))
    await screen.findByText('/ 3')
    await waitFor(() =>
      expect(screen.getByRole<HTMLInputElement>('spinbutton', {name: 'PDF 배율 (%)'}).value).toBe(
        '100',
      ),
    )
    expect(screen.getByRole('button', {name: '화면에 맞춤'}).getAttribute('aria-pressed')).toBe(
      'true',
    )
    expect(screen.getByRole<HTMLInputElement>('spinbutton', {name: 'PDF 페이지'}).value).toBe('2')
  })

  it('should render PDF pages and preserve toolbar input identity through navigation and zoom', async () => {
    const view = render(() => <SPdfDocument blob={new Blob()} path="guide.pdf" />)
    const input = await screen.findByRole<HTMLInputElement>('spinbutton', {name: 'PDF 페이지'})
    expect(await screen.findByText('/ 3')).toBeTruthy()
    const pagination = screen.getByRole('group', {name: 'PDF 페이지 조절'})
    expect(pagination.contains(input)).toBe(true)
    expect(pagination.contains(screen.getByRole('button', {name: '다음 PDF 페이지'}))).toBe(true)
    expect(screen.getByRole<HTMLButtonElement>('button', {name: '이전 PDF 페이지'}).disabled).toBe(
      true,
    )
    fireEvent.click(screen.getByRole('button', {name: '다음 PDF 페이지'}))
    expect(input.value).toBe('2')
    expect(screen.getByRole('spinbutton', {name: 'PDF 페이지'})).toBe(input)
    fireEvent.input(input, {target: {value: '3'}})
    fireEvent.keyDown(input, {key: 'Enter'})
    expect(input.value).toBe('3')
    expect(screen.getByRole<HTMLButtonElement>('button', {name: '다음 PDF 페이지'}).disabled).toBe(
      true,
    )
    const zoom = screen.getByRole<HTMLInputElement>('spinbutton', {name: 'PDF 배율 (%)'})
    fireEvent.input(zoom, {target: {value: '150'}})
    fireEvent.keyDown(zoom, {key: 'Enter'})
    expect(zoom.value).toBe('150')
    const magnification = screen.getByRole('group', {name: 'PDF 배율 조절'})
    expect(magnification.contains(zoom)).toBe(true)
    expect(magnification.contains(screen.getByRole('button', {name: 'PDF 확대'}))).toBe(true)
    expect(draw).toHaveBeenCalled()
    view.unmount()
    expect(destroy).toHaveBeenCalledOnce()
  })
  it('should adjust the committed page and zoom with grouped controls and disable their limits', async () => {
    render(() => <SPdfDocument blob={new Blob()} path="guide.pdf" />)
    await screen.findByText('/ 3')
    const input = screen.getByRole<HTMLInputElement>('spinbutton', {name: 'PDF 페이지'})
    fireEvent.click(screen.getByRole('button', {name: '다음 PDF 페이지'}))
    fireEvent.click(screen.getByRole('button', {name: '이전 PDF 페이지'}))
    expect(input.value).toBe('1')
    const zoom = screen.getByRole<HTMLInputElement>('spinbutton', {name: 'PDF 배율 (%)'})
    fireEvent.input(zoom, {target: {value: '375'}})
    fireEvent.blur(zoom)
    fireEvent.click(screen.getByRole('button', {name: 'PDF 확대'}))
    expect(zoom.value).toBe('400')
    expect(screen.getByRole<HTMLButtonElement>('button', {name: 'PDF 확대'}).disabled).toBe(true)
    fireEvent.input(zoom, {target: {value: '50'}})
    fireEvent.keyDown(zoom, {key: 'Enter'})
    fireEvent.click(screen.getByRole('button', {name: 'PDF 축소'}))
    expect(zoom.value).toBe('25')
    expect(screen.getByRole<HTMLButtonElement>('button', {name: 'PDF 축소'}).disabled).toBe(true)
    expect(screen.getByRole('spinbutton', {name: 'PDF 배율 (%)'})).toBe(zoom)
  })
  it('should display a rejected PDF through the existing error channel', async () => {
    const failure = new Error('Invalid PDF structure')
    vi.mocked(createDocument).mockReturnValue({destroy, result: Promise.reject(failure)})
    const onError = vi.fn()
    render(() => <SPdfDocument blob={new Blob()} path="broken.pdf" onError={onError} />)
    await waitFor(() => expect(onError).toHaveBeenCalled())
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({
        cause: failure,
        message: expect.stringContaining('PDF를 표시할 수 없습니다'),
      }),
    )
    expect(screen.queryByRole('status')).toBeNull()
  })
  it('should ignore a departed file loading failure and release its worker', async () => {
    const obsolete = Promise.withResolvers<PdfDocument>()
    const release = vi.fn()
    vi.mocked(createDocument).mockReturnValueOnce({destroy: release, result: obsolete.promise})
    const [blob, setBlob] = createSignal(new Blob())
    const onError = vi.fn()
    render(() => <SPdfDocument blob={blob()} path="guide.pdf" onError={onError} />)
    setBlob(new Blob())
    obsolete.reject(new Error('Previous file failed'))
    expect(await screen.findByText('/ 3')).toBeTruthy()
    expect(release).toHaveBeenCalledOnce()
    expect(onError).not.toHaveBeenCalled()
  })
  it('should fit the observed content width without subtracting padding twice', async () => {
    let resize: ((entries: ResizeObserverEntry[]) => void) | undefined
    vi.stubGlobal(
      'ResizeObserver',
      class implements ResizeObserver {
        constructor(callback: ResizeObserverCallback) {
          resize = (entries) => callback(entries, this)
        }
        disconnect = vi.fn()
        observe = vi.fn()
        unobserve = vi.fn()
      },
    )
    render(() => <SPdfDocument blob={new Blob()} path="guide.pdf" />)
    await screen.findByText('/ 3')
    const viewport = screen.getByLabelText('PDF 페이지 보기')
    expect(resize).toBeDefined()
    if (resize !== undefined) {
      resize([
        {
          borderBoxSize: [],
          contentBoxSize: [],
          contentRect: new DOMRect(0, 0, 900, 800),
          devicePixelContentBoxSize: [],
          target: viewport,
        },
      ])
    }
    const zoom = screen.getByRole<HTMLInputElement>('spinbutton', {name: 'PDF 배율 (%)'})
    await waitFor(() => expect(zoom.value).toBe('150'))
  })
})
