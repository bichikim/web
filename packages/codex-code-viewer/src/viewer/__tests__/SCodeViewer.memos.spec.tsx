/** @vitest-environment jsdom */
import {cleanup, fireEvent, render, screen, within} from '@solidjs/testing-library'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'
import {SCodeViewer} from '../SCodeViewer'
import type {ViewerPort} from '../types'
import type {MemoState} from '../../shared/memo-state'

const initial: MemoState = {
  expanded: true,
  items: ['버튼 간격 확인', '오류 문구 정리'],
  visible: true,
}
const mount = (state: MemoState = initial) => {
  let saved = state
  const port: ViewerPort = {
    addTextContext: vi.fn().mockResolvedValue(undefined),
    call: vi.fn().mockResolvedValue({content: []}),
    context: vi.fn(),
    readMemos: vi.fn(async () => saved),
    saveMemos: vi.fn(async (patch) => {
      saved = {...saved, ...patch}
      return saved
    }),
    start: vi.fn<ViewerPort['start']>().mockResolvedValue(() => {}),
  }
  const mounted = render(() => <SCodeViewer port={port} />)
  return {mounted, port}
}
const popover = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'showPopover')
beforeEach(() => {
  localStorage.setItem('codex-code-viewer.language', 'ko')
  Object.defineProperty(HTMLElement.prototype, 'showPopover', {configurable: true, value: vi.fn()})
})
afterEach(() => {
  cleanup()
  localStorage.clear()
  vi.restoreAllMocks()
  if (popover === undefined) {
    Reflect.deleteProperty(HTMLElement.prototype, 'showPopover')
  } else {
    Object.defineProperty(HTMLElement.prototype, 'showPopover', popover)
  }
})

it('should hide and restore the entire memo panel independently of its collapsed state', async () => {
  const {port} = mount({...initial, expanded: false})
  const panel = await screen.findByRole('region', {name: '메모'})
  expect(within(panel).getByRole('button', {name: '메모 펼치기'})).toHaveAttribute(
    'aria-expanded',
    'false',
  )
  fireEvent.click(screen.getByRole('button', {name: '메모'}))
  expect(screen.queryByRole('region', {name: '메모'})).toBeNull()
  fireEvent.click(screen.getByRole('button', {name: '메모'}))
  expect(within(panel).getByRole('button', {name: '메모 펼치기'})).toBeInTheDocument()
  expect(within(panel).queryByRole('list')).toBeNull()
  expect(port.saveMemos).toHaveBeenCalledWith({visible: false})
  expect(port.saveMemos).toHaveBeenCalledWith({visible: true})
})

it('should preserve an expanded panel and its unfinished input across hiding and showing', async () => {
  mount()
  const input = await screen.findByRole('textbox', {name: '새 메모'})
  fireEvent.input(input, {target: {value: '아직 작성 중'}})
  fireEvent.click(screen.getByRole('button', {name: '메모'}))
  fireEvent.click(screen.getByRole('button', {name: '메모'}))
  expect(screen.getByRole('textbox', {name: '새 메모'})).toBe(input)
  expect(input).toHaveValue('아직 작성 중')
  fireEvent.click(screen.getByRole('button', {name: '메모 접기'}))
  expect(screen.getByRole('region', {name: '메모'})).toBeInTheDocument()
  expect(screen.queryByRole('list')).toBeNull()
  fireEvent.click(screen.getByRole('button', {name: '메모 펼치기'}))
  expect(screen.getByRole('textbox', {name: '새 메모'})).toHaveValue('아직 작성 중')
})

it('should add only the clicked memo to chat with an icon-only action before opening a file', async () => {
  const {port} = mount()
  const panel = await screen.findByRole('region', {name: '메모'})
  const buttons = within(panel).getAllByRole('button', {name: '채팅에 추가'})
  expect(buttons[1]).toHaveTextContent('')
  fireEvent.click(buttons[1]!)
  await vi.waitFor(
    () => expect(port.addTextContext).toHaveBeenCalledExactlyOnceWith('오류 문구 정리'),
    {interval: 1},
  )
  expect(within(panel).getAllByRole('listitem')).toHaveLength(2)
  expect(port.context).not.toHaveBeenCalled()
  expect(port.call).not.toHaveBeenCalled()
})

it('should save a new memo and restore it after reopening without changing its text', async () => {
  const {mounted, port} = mount()
  const input = await screen.findByRole('textbox', {name: '새 메모'})
  fireEvent.input(input, {target: {value: '내보내기 다시 확인'}})
  fireEvent.submit(input.closest('form')!)
  await screen.findByText('내보내기 다시 확인')
  expect(input).toHaveValue('')
  expect(port.saveMemos).toHaveBeenCalledWith({items: [...initial.items, '내보내기 다시 확인']})
  mounted.unmount()
  render(() => <SCodeViewer port={port} />)
  expect(await screen.findByText('내보내기 다시 확인')).toBeInTheDocument()
})

it('should retain a memo draft when storage fails and allow retrying', async () => {
  const {port} = mount()
  const input = await screen.findByRole('textbox', {name: '새 메모'})
  vi.mocked(port.saveMemos!).mockRejectedValueOnce(new Error('저장 실패'))
  fireEvent.input(input, {target: {value: '실패해도 남길 메모'}})
  fireEvent.submit(input.closest('form')!)
  await screen.findByText('저장 실패')
  expect(input).toHaveValue('실패해도 남길 메모')
  expect(screen.getAllByRole('listitem')).toHaveLength(2)
  fireEvent.submit(input.closest('form')!)
  expect(await screen.findByText('실패해도 남길 메모')).toBeInTheDocument()
})

it('should edit one memo, attach its updated text and restore the edit after reopening', async () => {
  const {mounted, port} = mount()
  await screen.findByText('오류 문구 정리')
  const row = screen.getAllByRole('listitem')[1]!
  fireEvent.click(within(row).getByRole('button', {name: '메모 작업'}))
  fireEvent.click(screen.getByRole('menuitem', {name: '수정'}))
  const input = screen.getByRole('textbox', {name: '메모 수정'})
  expect(input).toHaveFocus()
  fireEvent.input(input, {target: {value: '오류 문구를 짧게 정리'}})
  fireEvent.submit(input.closest('form')!)
  await screen.findByText('오류 문구를 짧게 정리')
  expect(port.saveMemos).toHaveBeenCalledWith({items: ['버튼 간격 확인', '오류 문구를 짧게 정리']})
  const updated = screen.getAllByRole('listitem')[1]!
  expect(within(updated).getByRole('button', {name: '메모 작업'})).toHaveFocus()
  fireEvent.click(within(updated).getByRole('button', {name: '채팅에 추가'}))
  await vi.waitFor(
    () => expect(port.addTextContext).toHaveBeenCalledExactlyOnceWith('오류 문구를 짧게 정리'),
    {interval: 1},
  )
  mounted.unmount()
  render(() => <SCodeViewer port={port} />)
  expect(await screen.findByText('오류 문구를 짧게 정리')).toBeInTheDocument()
})

it('should cancel memo editing with Escape without saving and return focus to its actions', async () => {
  const {port} = mount()
  await screen.findByText('버튼 간격 확인')
  const row = screen.getAllByRole('listitem')[0]!
  fireEvent.click(within(row).getByRole('button', {name: '메모 작업'}))
  fireEvent.click(screen.getByRole('menuitem', {name: '수정'}))
  const input = screen.getByRole('textbox', {name: '메모 수정'})
  fireEvent.input(input, {target: {value: '취소할 내용'}})
  fireEvent.keyDown(input, {key: 'Escape'})
  expect(screen.queryByRole('textbox', {name: '메모 수정'})).toBeNull()
  expect(within(row).getByRole('button', {name: '메모 작업'})).toHaveFocus()
  expect(screen.getByText('버튼 간격 확인')).toBeInTheDocument()
  expect(port.saveMemos).not.toHaveBeenCalled()
})

it('should delete only the selected duplicate and retain that deletion after reopening', async () => {
  const {mounted, port} = mount({...initial, items: ['같은 메모', '남길 메모', '같은 메모']})
  await screen.findByText('남길 메모')
  const row = screen.getAllByRole('listitem')[2]!
  fireEvent.click(within(row).getByRole('button', {name: '메모 작업'}))
  fireEvent.click(screen.getByRole('menuitem', {name: '삭제'}))
  await vi.waitFor(() => expect(screen.getAllByRole('listitem')).toHaveLength(2), {interval: 1})
  expect(screen.getAllByText('같은 메모')).toHaveLength(1)
  expect(port.saveMemos).toHaveBeenCalledWith({items: ['같은 메모', '남길 메모']})
  expect(
    within(screen.getAllByRole('listitem')[1]!).getByRole('button', {name: '메모 작업'}),
  ).toHaveFocus()
  mounted.unmount()
  render(() => <SCodeViewer port={port} />)
  await screen.findByText('남길 메모')
  expect(screen.getAllByRole('listitem')).toHaveLength(2)
})

it('should retain the edited draft after a failed save and allow retrying it', async () => {
  const {port} = mount()
  await screen.findByText('버튼 간격 확인')
  fireEvent.click(
    within(screen.getAllByRole('listitem')[0]!).getByRole('button', {name: '메모 작업'}),
  )
  fireEvent.click(screen.getByRole('menuitem', {name: '수정'}))
  const input = screen.getByRole('textbox', {name: '메모 수정'})
  fireEvent.input(input, {target: {value: '저장 실패해도 유지'}})
  vi.mocked(port.saveMemos!).mockRejectedValueOnce(new Error('수정 저장 실패'))
  fireEvent.submit(input.closest('form')!)
  await screen.findByText('수정 저장 실패')
  expect(input).toHaveValue('저장 실패해도 유지')
  expect(screen.getByText('오류 문구 정리')).toBeInTheDocument()
  fireEvent.submit(input.closest('form')!)
  expect(await screen.findByText('저장 실패해도 유지')).toBeInTheDocument()
})

it('should keep a memo when deletion fails and focus the new-memo input after deleting the last row', async () => {
  const {port} = mount({...initial, items: ['마지막 메모']})
  await screen.findByText('마지막 메모')
  const actions = screen.getByRole('button', {name: '메모 작업'})
  vi.mocked(port.saveMemos!).mockRejectedValueOnce(new Error('삭제 저장 실패'))
  fireEvent.click(actions)
  fireEvent.click(screen.getByRole('menuitem', {name: '삭제'}))
  await screen.findByText('삭제 저장 실패')
  expect(screen.getByText('마지막 메모')).toBeInTheDocument()
  fireEvent.click(actions)
  fireEvent.click(screen.getByRole('menuitem', {name: '삭제'}))
  await vi.waitFor(() => expect(screen.queryAllByRole('listitem')).toHaveLength(0), {interval: 1})
  expect(screen.getByRole('textbox', {name: '새 메모'})).toHaveFocus()
})

it('should reject an empty edit without removing its saved memo', async () => {
  const {port} = mount()
  await screen.findByText('버튼 간격 확인')
  fireEvent.click(
    within(screen.getAllByRole('listitem')[0]!).getByRole('button', {name: '메모 작업'}),
  )
  fireEvent.click(screen.getByRole('menuitem', {name: '수정'}))
  const input = screen.getByRole('textbox', {name: '메모 수정'})
  fireEvent.input(input, {target: {value: '  '}})
  expect(screen.getByRole('button', {name: '저장'})).toBeDisabled()
  fireEvent.submit(input.closest('form')!)
  await Promise.resolve()
  expect(port.saveMemos).not.toHaveBeenCalled()
  expect(input).toHaveValue('  ')
  fireEvent.keyDown(input, {key: 'Escape'})
  expect(screen.getByText('버튼 간격 확인')).toBeInTheDocument()
})

it('should protect an active duplicate edit from other row actions and further typing during persistence', async () => {
  const {port} = mount({...initial, items: ['같은 메모', '같은 메모']})
  await screen.findAllByText('같은 메모')
  const rows = screen.getAllByRole('listitem')
  fireEvent.click(within(rows[1]!).getByRole('button', {name: '메모 작업'}))
  fireEvent.click(screen.getByRole('menuitem', {name: '수정'}))
  expect(within(rows[0]!).getByRole('button', {name: '메모 작업'})).toBeDisabled()
  const pending = Promise.withResolvers<MemoState>()
  vi.mocked(port.saveMemos!).mockReturnValueOnce(pending.promise)
  const input = screen.getByRole('textbox', {name: '메모 수정'})
  fireEvent.input(input, {target: {value: '두 번째 항목 수정'}})
  fireEvent.submit(input.closest('form')!)
  expect(input).toHaveAttribute('readonly')
  expect(screen.getByRole('button', {name: '취소'})).toBeDisabled()
  pending.resolve({...initial, items: ['같은 메모', '두 번째 항목 수정']})
  await screen.findByText('두 번째 항목 수정')
  expect(screen.getAllByText('같은 메모')).toHaveLength(1)
  expect(screen.getAllByRole('button', {name: '메모 작업'})).toSatisfy(
    (buttons: HTMLButtonElement[]) => buttons.every((button) => !button.disabled),
  )
})
