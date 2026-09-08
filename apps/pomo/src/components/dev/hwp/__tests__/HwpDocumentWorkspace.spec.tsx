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
})

it('should destroy a studio that resolves after WASM initialization fails', async () => {
  const pending = Promise.withResolvers<typeof editorMock>()
  coreMocks.init.mockRejectedValueOnce(new Error('wasm init failed'))
  editorMocks.createStudio.mockReturnValueOnce(pending.promise)
  const view = render(() => <HwpDocumentWorkspace />)
  await screen.findByText('문서 엔진을 준비하지 못했어요.')

  pending.resolve(editorMock)
  await waitFor(() => expect(editorMock.destroy).toHaveBeenCalledOnce())
  view.unmount()
  expect(editorMock.destroy).toHaveBeenCalledOnce()
})

it('should destroy an acquired studio when WASM initialization later fails', async () => {
  const pending = Promise.withResolvers<void>()
  coreMocks.init.mockReturnValueOnce(pending.promise)
  const view = render(() => <HwpDocumentWorkspace />)
  await Promise.resolve()

  pending.reject(new Error('wasm init failed'))
  await screen.findByText('문서 엔진을 준비하지 못했어요.')
  expect(editorMock.destroy).toHaveBeenCalledOnce()
  view.unmount()
  expect(editorMock.destroy).toHaveBeenCalledOnce()
})

it('should destroy an acquired studio on unmount while WASM is pending', async () => {
  const pending = Promise.withResolvers<void>()
  coreMocks.init.mockReturnValueOnce(pending.promise)
  const view = render(() => <HwpDocumentWorkspace />)
  await Promise.resolve()

  view.unmount()
  expect(editorMock.destroy).toHaveBeenCalledOnce()
  pending.resolve()
  await Promise.resolve()
  await Promise.resolve()
  expect(editorMock.destroy).toHaveBeenCalledOnce()
})

it('should destroy a studio arriving after unmount without waiting for WASM', async () => {
  const wasm = Promise.withResolvers<void>()
  const studio = Promise.withResolvers<typeof editorMock>()
  coreMocks.init.mockReturnValueOnce(wasm.promise)
  editorMocks.createStudio.mockReturnValueOnce(studio.promise)
  const view = render(() => <HwpDocumentWorkspace />)
  view.unmount()

  studio.resolve(editorMock)
  await waitFor(() => expect(editorMock.destroy).toHaveBeenCalledOnce())
  wasm.resolve()
  await Promise.resolve()
  await Promise.resolve()
  expect(editorMock.destroy).toHaveBeenCalledOnce()
})

it('should remain unavailable when studio creation fails before WASM resolves', async () => {
  const pending = Promise.withResolvers<void>()
  coreMocks.init.mockReturnValueOnce(pending.promise)
  editorMocks.createStudio.mockRejectedValueOnce(new Error('studio init failed'))
  render(() => <HwpDocumentWorkspace />)
  await screen.findByText('문서 엔진을 준비하지 못했어요.')

  pending.resolve()
  await Promise.resolve()
  expect(screen.getByText('문서 엔진을 준비하지 못했어요.')).toBeDefined()
  expect(screen.getByRole('button', {name: '예제 바로 열기'})).toBeDisabled()
  expect(editorMock.destroy).not.toHaveBeenCalled()
})

it('should destroy the ready studio once on unmount', async () => {
  const view = render(() => <HwpDocumentWorkspace />)
  await screen.findByText('Rust/WASM 문서 엔진과 iframe 에디터 준비 완료')
  expect(editorMock.destroy).not.toHaveBeenCalled()

  view.unmount()
  expect(editorMock.destroy).toHaveBeenCalledOnce()
})

it('should not destroy the studio again when WASM fails after unmount', async () => {
  const pending = Promise.withResolvers<void>()
  coreMocks.init.mockReturnValueOnce(pending.promise)
  const view = render(() => <HwpDocumentWorkspace />)
  await Promise.resolve()
  view.unmount()
  expect(editorMock.destroy).toHaveBeenCalledOnce()

  pending.reject(new Error('wasm init failed'))
  await new Promise<void>((resolve) => {
    queueMicrotask(resolve)
  })
  expect(editorMock.destroy).toHaveBeenCalledOnce()
})
