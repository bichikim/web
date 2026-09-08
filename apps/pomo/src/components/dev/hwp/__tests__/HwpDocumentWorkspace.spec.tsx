/** @vitest-environment jsdom */

import {cleanup, fireEvent, render, screen, waitFor} from '@solidjs/testing-library'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'

import type {ExpenseForm} from '../expense'

const coreMocks = vi.hoisted(() => ({
  HwpDocument: vi.fn(),
  init: vi.fn(),
}))
const editorMocks = vi.hoisted(() => ({
  createStudio: vi.fn(),
}))
const fetchMocks = vi.hoisted(() => ({
  fetch: vi.fn(),
}))
const assistantMocks = vi.hoisted(() => ({
  onApply: null as ((form: ExpenseForm) => Promise<void> | void) | null,
}))

vi.mock('@rhwp/core', () => ({
  default: coreMocks.init,
  HwpDocument: coreMocks.HwpDocument,
}))
vi.mock('@rhwp/editor', () => ({
  createStudio: editorMocks.createStudio,
}))
vi.stubGlobal('fetch', fetchMocks.fetch)
vi.mock('../HwpExpenseAssistant', () => ({
  HwpExpenseAssistant: (props: {readonly onApply: (form: ExpenseForm) => Promise<void> | void}) => {
    assistantMocks.onApply = props.onApply
    return <output>expense assistant</output>
  },
}))

import {HwpDocumentWorkspace} from '../HwpDocumentWorkspace'

const documentMock = {
  exportHwp: vi.fn(),
  free: vi.fn(),
  getFieldList: vi.fn(),
  pageCount: vi.fn(),
  renderPageSvg: vi.fn(),
  setFieldValueByName: vi.fn(),
}

const editorMock = {
  destroy: vi.fn(),
  element: {title: ''},
  hwpctrl: {
    batch: vi.fn(),
  },
  loadFile: vi.fn(),
}

beforeEach(() => {
  assistantMocks.onApply = null
  coreMocks.init.mockResolvedValue(undefined)
  coreMocks.HwpDocument.mockImplementation(function mockDocument() {
    return documentMock
  })
  documentMock.getFieldList.mockReturnValue(
    JSON.stringify([
      {name: 'date'},
      {name: 'item_1'},
      {name: 'unitPrice_1'},
      {name: 'quantity_1'},
      {name: 'amount_1'},
      {name: 'total'},
    ]),
  )
  documentMock.pageCount.mockReturnValue(2)
  documentMock.renderPageSvg.mockReturnValue('<svg><text>첫 페이지</text></svg>')
  documentMock.exportHwp.mockReturnValue(new Uint8Array([9]))
  documentMock.setFieldValueByName.mockReturnValue('{"ok":true}')
  editorMocks.createStudio.mockResolvedValue(editorMock)
  editorMock.loadFile.mockResolvedValue({pageCount: 2})
  editorMock.hwpctrl.batch.mockResolvedValue([])
  fetchMocks.fetch.mockResolvedValue({
    arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(4)),
    ok: true,
  })
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

it('should initialize the direct Rust and WebAssembly document runtime', async () => {
  render(() => <HwpDocumentWorkspace />)

  await waitFor(() => expect(coreMocks.init).toHaveBeenCalledOnce())
  expect(await screen.findByText('Rust/WASM 문서 엔진과 iframe 에디터 준비 완료')).toBeDefined()
})

it('should load a selected HWP file into the iframe editor', async () => {
  render(() => <HwpDocumentWorkspace />)
  await screen.findByText('Rust/WASM 문서 엔진과 iframe 에디터 준비 완료')

  const file = new File(['hwp-bytes'], '가계부.hwpx', {type: 'application/vnd.hancom.hwpx'})
  Object.defineProperty(file, 'arrayBuffer', {
    value: vi.fn().mockResolvedValue(new ArrayBuffer(4)),
  })
  fireEvent.change(screen.getByLabelText('HWP 또는 HWPX 파일 열기'), {target: {files: [file]}})

  await waitFor(() => expect(coreMocks.HwpDocument).toHaveBeenCalledWith(expect.any(Uint8Array)))
  expect(editorMock.loadFile).toHaveBeenCalledWith(expect.any(Uint8Array), '가계부.hwpx', {
    suppressDialogs: true,
  })
  expect(documentMock.pageCount).toHaveBeenCalledOnce()
  expect(documentMock.renderPageSvg).toHaveBeenCalledWith(0)
  expect(screen.getByText('가계부.hwpx · 2페이지 · iframe 에디터 준비 완료')).toBeDefined()
})

it('should open the public expense form example', async () => {
  render(() => <HwpDocumentWorkspace />)
  await screen.findByText('Rust/WASM 문서 엔진과 iframe 에디터 준비 완료')

  fireEvent.click(screen.getByRole('button', {name: '예제 바로 열기'}))

  await waitFor(() => expect(fetchMocks.fetch).toHaveBeenCalledWith('/expense-form-template.hwp'))
  await waitFor(() => expect(editorMock.loadFile).toHaveBeenCalledOnce())
  expect(editorMock.loadFile).toHaveBeenCalledWith(
    expect.any(Uint8Array),
    'expense-form-template.hwp',
    {
      suppressDialogs: true,
    },
  )
  expect(
    screen.getByText('expense-form-template.hwp · 2페이지 · iframe 에디터 준비 완료'),
  ).toBeDefined()
})

it('should apply fields through the direct document and reload the iframe with the result', async () => {
  render(() => <HwpDocumentWorkspace />)
  await screen.findByText('Rust/WASM 문서 엔진과 iframe 에디터 준비 완료')

  const file = new File(['hwp-bytes'], '가계부.hwp', {type: 'application/x-hwp'})
  Object.defineProperty(file, 'arrayBuffer', {
    value: vi.fn().mockResolvedValue(new ArrayBuffer(4)),
  })
  fireEvent.change(screen.getByLabelText('HWP 또는 HWPX 파일 열기'), {target: {files: [file]}})
  await waitFor(() => expect(assistantMocks.onApply).not.toBeNull())
  await waitFor(() =>
    expect(screen.getByText('가계부.hwp · 2페이지 · iframe 에디터 준비 완료')).toBeDefined(),
  )

  await assistantMocks.onApply?.({
    date: null,
    items: [{amount: 2000, name: '당근', quantity: 1, unitPrice: 2000}],
    questions: [],
    total: 2000,
  })

  expect(documentMock.setFieldValueByName).toHaveBeenCalledWith('item_1', '당근')
  expect(documentMock.setFieldValueByName).toHaveBeenCalledWith('total', '2000')
  expect(documentMock.exportHwp).toHaveBeenCalledOnce()
  expect(editorMock.loadFile).toHaveBeenLastCalledWith(expect.any(Uint8Array), '가계부.hwp', {
    skipUnsavedGuard: true,
    suppressDialogs: true,
  })
})

it('should reject a form when the HWP cannot represent every expense item', async () => {
  render(() => <HwpDocumentWorkspace />)
  await screen.findByText('Rust/WASM 문서 엔진과 iframe 에디터 준비 완료')

  const file = new File(['hwp-bytes'], '가계부.hwp', {type: 'application/x-hwp'})
  Object.defineProperty(file, 'arrayBuffer', {
    value: vi.fn().mockResolvedValue(new ArrayBuffer(4)),
  })
  fireEvent.change(screen.getByLabelText('HWP 또는 HWPX 파일 열기'), {target: {files: [file]}})
  await waitFor(() =>
    expect(screen.getByText('가계부.hwp · 2페이지 · iframe 에디터 준비 완료')).toBeDefined(),
  )
  documentMock.getFieldList.mockReturnValue(
    JSON.stringify([
      {name: 'date'},
      {name: 'item_1'},
      {name: 'unitPrice_1'},
      {name: 'quantity_1'},
      {name: 'amount_1'},
      {name: 'total'},
    ]),
  )

  const apply = assistantMocks.onApply
  expect(apply).not.toBeNull()
  await expect(
    apply?.({
      date: null,
      items: [
        {amount: 2000, name: '당근', quantity: 1, unitPrice: 2000},
        {amount: 2000, name: '고구마', quantity: 2, unitPrice: 1000},
      ],
      questions: [],
      total: 4000,
    }),
  ).rejects.toThrow('item_2')
  expect(documentMock.setFieldValueByName).not.toHaveBeenCalled()
  expect(documentMock.exportHwp).not.toHaveBeenCalled()
  expect(screen.getByLabelText('HWP 또는 HWPX 파일 열기')).not.toBeDisabled()
})

const expenseForm: ExpenseForm = {
  date: null,
  items: [{amount: 2000, name: '당근', quantity: 1, unitPrice: 2000}],
  questions: [],
  total: 2000,
}

const openExample = async () => {
  const view = render(() => <HwpDocumentWorkspace />)
  await screen.findByText('Rust/WASM 문서 엔진과 iframe 에디터 준비 완료')
  fireEvent.click(screen.getByRole('button', {name: '예제 바로 열기'}))
  await screen.findByText('expense-form-template.hwp · 2페이지 · iframe 에디터 준비 완료')
  return view
}

it('should serialize apply with file opening and other applies', async () => {
  await openExample()
  const pending = Promise.withResolvers<{readonly pageCount: number}>()
  editorMock.loadFile.mockReturnValueOnce(pending.promise)
  const applying = assistantMocks.onApply?.(expenseForm)
  const input = screen.getByLabelText('HWP 또는 HWPX 파일 열기')
  expect(input).toBeDisabled()
  expect(screen.getByRole('button', {name: '예제 바로 열기'})).toBeDisabled()
  const file = new File(['replacement'], 'replacement.hwp')
  const readBytes = vi.fn().mockResolvedValue(new ArrayBuffer(4))
  Object.defineProperty(file, 'arrayBuffer', {value: readBytes})
  fireEvent.change(input, {target: {files: [file]}})
  await expect(assistantMocks.onApply?.(expenseForm)).rejects.toThrow('문서 작업')
  expect(readBytes).not.toHaveBeenCalled()
  expect(editorMock.loadFile).toHaveBeenCalledTimes(2)
  pending.resolve({pageCount: 3})
  await applying
  expect(await screen.findByText('양식 필드 적용 완료 · 3페이지')).toBeDefined()
  expect(input).not.toBeDisabled()
  fireEvent.change(input, {target: {files: [file]}})
  await screen.findByText('replacement.hwp · 2페이지 · iframe 에디터 준비 완료')
  expect(documentMock.free).toHaveBeenCalledOnce()
})

it('should release the busy state when applying fails', async () => {
  await openExample()
  editorMock.loadFile.mockRejectedValueOnce(new Error('apply failed'))
  await expect(assistantMocks.onApply?.(expenseForm)).rejects.toThrow('apply failed')
  expect(screen.getByLabelText('HWP 또는 HWPX 파일 열기')).not.toBeDisabled()
  await assistantMocks.onApply?.(expenseForm)
  expect(await screen.findByText('양식 필드 적용 완료 · 2페이지')).toBeDefined()
})

it.each(['resolve', 'reject'] as const)(
  'should ignore an apply that settles after disposal: %s',
  async (settlement) => {
    const view = await openExample()
    const pending = Promise.withResolvers<{readonly pageCount: number}>()
    editorMock.loadFile.mockReturnValueOnce(pending.promise)
    const applying = assistantMocks.onApply?.(expenseForm)
    view.unmount()
    documentMock.renderPageSvg.mockClear()
    if (settlement === 'resolve') {
      pending.resolve({pageCount: 3})
    } else {
      pending.reject(new Error('editor destroyed'))
    }
    await expect(applying).resolves.toBeUndefined()
    expect(documentMock.renderPageSvg).not.toHaveBeenCalled()
    expect(documentMock.free).toHaveBeenCalledOnce()
    expect(editorMock.destroy).toHaveBeenCalledOnce()
  },
)

it.each(['resolve', 'reject'] as const)(
  'should free a pending replacement exactly once after disposal: %s',
  async (settlement) => {
    const view = await openExample()
    const replacement = {...documentMock, free: vi.fn(), renderPageSvg: vi.fn()}
    coreMocks.HwpDocument.mockImplementationOnce(function replacementDocument() {
      return replacement
    })
    const pending = Promise.withResolvers<{readonly pageCount: number}>()
    editorMock.loadFile.mockReturnValueOnce(pending.promise)
    fireEvent.click(screen.getByRole('button', {name: '예제 바로 열기'}))
    await waitFor(() => expect(editorMock.loadFile).toHaveBeenCalledTimes(2))
    await expect(assistantMocks.onApply?.(expenseForm)).rejects.toThrow('문서 작업')
    view.unmount()
    if (settlement === 'resolve') {
      pending.resolve({pageCount: 3})
    } else {
      pending.reject(new Error('editor destroyed'))
    }
    await waitFor(() => expect(replacement.free).toHaveBeenCalledOnce())
    expect(documentMock.free).toHaveBeenCalledOnce()
    expect(replacement.renderPageSvg).not.toHaveBeenCalled()
  },
)

it('should avoid opening a file whose bytes arrive after disposal', async () => {
  const view = await openExample()
  const pending = Promise.withResolvers<ArrayBuffer>()
  const file = new File(['replacement'], 'replacement.hwp')
  Object.defineProperty(file, 'arrayBuffer', {value: vi.fn().mockReturnValue(pending.promise)})
  fireEvent.change(screen.getByLabelText('HWP 또는 HWPX 파일 열기'), {target: {files: [file]}})
  expect(screen.getByLabelText('HWP 또는 HWPX 파일 열기')).toBeDisabled()
  view.unmount()
  pending.resolve(new ArrayBuffer(4))
  await pending.promise
  expect(coreMocks.HwpDocument).toHaveBeenCalledOnce()
  expect(editorMock.loadFile).toHaveBeenCalledOnce()
  expect(documentMock.free).toHaveBeenCalledOnce()
})

it.each(['before', 'after'] as const)(
  'should destroy a studio that resolves %s WASM initialization fails',
  async (order) => {
    const initialization = Promise.withResolvers<void>()
    const studio = Promise.withResolvers<typeof editorMock>()
    coreMocks.init.mockReturnValueOnce(initialization.promise)
    editorMocks.createStudio.mockReturnValueOnce(studio.promise)
    const view = render(() => <HwpDocumentWorkspace />)
    if (order === 'before') {
      studio.resolve(editorMock)
      await studio.promise
    }
    initialization.reject(new Error('wasm init failed'))
    await screen.findByText('문서 엔진을 준비하지 못했어요.')
    studio.resolve(editorMock)
    await waitFor(() => expect(editorMock.destroy).toHaveBeenCalledOnce())
    expect(screen.getByLabelText('HWP 또는 HWPX 파일 열기')).toBeDisabled()
    view.unmount()
    expect(editorMock.destroy).toHaveBeenCalledOnce()
  },
)

it('should destroy a ready studio during disposal while WASM is still pending', async () => {
  const initialization = Promise.withResolvers<void>()
  coreMocks.init.mockReturnValueOnce(initialization.promise)
  const view = render(() => <HwpDocumentWorkspace />)
  await waitFor(() => expect(editorMocks.createStudio).toHaveBeenCalledOnce())
  expect(screen.getByLabelText('HWP 또는 HWPX 파일 열기')).toBeDisabled()
  view.unmount()
  expect(editorMock.destroy).toHaveBeenCalledOnce()
  initialization.resolve()
  await initialization.promise
  expect(editorMock.destroy).toHaveBeenCalledOnce()
})

it('should destroy a studio that resolves after disposal before WASM is ready', async () => {
  const initialization = Promise.withResolvers<void>()
  const studio = Promise.withResolvers<typeof editorMock>()
  coreMocks.init.mockReturnValueOnce(initialization.promise)
  editorMocks.createStudio.mockReturnValueOnce(studio.promise)
  const view = render(() => <HwpDocumentWorkspace />)
  view.unmount()
  studio.resolve(editorMock)
  await waitFor(() => expect(editorMock.destroy).toHaveBeenCalledOnce())
  initialization.resolve()
  await initialization.promise
  expect(editorMock.destroy).toHaveBeenCalledOnce()
})

it('should keep opening disabled when studio creation fails before WASM completes', async () => {
  const initialization = Promise.withResolvers<void>()
  coreMocks.init.mockReturnValueOnce(initialization.promise)
  editorMocks.createStudio.mockRejectedValueOnce(new Error('studio failed'))
  const view = render(() => <HwpDocumentWorkspace />)
  await screen.findByText('문서 엔진을 준비하지 못했어요.')
  initialization.resolve()
  await initialization.promise
  expect(screen.getByLabelText('HWP 또는 HWPX 파일 열기')).toBeDisabled()
  view.unmount()
  expect(editorMock.destroy).not.toHaveBeenCalled()
})

it('should retain the current document and release a failed replacement', async () => {
  const view = await openExample()
  const replacement = {...documentMock, free: vi.fn(), renderPageSvg: vi.fn()}
  coreMocks.HwpDocument.mockImplementationOnce(function replacementDocument() {
    return replacement
  })
  editorMock.loadFile.mockRejectedValueOnce(new Error('replacement failed'))
  fireEvent.click(screen.getByRole('button', {name: '예제 바로 열기'}))
  await screen.findByText('예제 HWP 파일을 열지 못했어요. public 파일을 확인해 주세요.')
  expect(replacement.free).toHaveBeenCalledOnce()
  expect(documentMock.free).not.toHaveBeenCalled()
  expect(screen.getByLabelText('HWP 또는 HWPX 파일 열기')).not.toBeDisabled()
  await assistantMocks.onApply?.(expenseForm)
  expect(await screen.findByText('양식 필드 적용 완료 · 2페이지')).toBeDefined()
  view.unmount()
  expect(replacement.free).toHaveBeenCalledOnce()
  expect(documentMock.free).toHaveBeenCalledOnce()
})
