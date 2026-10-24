/** @vitest-environment jsdom */
import {cleanup, fireEvent, render, screen, waitFor} from '@solidjs/testing-library'
import {afterEach, beforeEach, expect, test, vi} from 'vitest'
import {createPlayerFixture} from './fixtures/player'
import {createDemoDocument, type PuppetDocument} from '../../player'
import {addThreeDimensionalParameter, insertParameterKeyform} from '../internal/parameter-keyforms'
import {PuppetEditor} from '../PuppetEditor'

const mocks = vi.hoisted(() => ({createPlayer: vi.fn()}))
vi.mock('../../player', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../player')>()),
  createPlayer: mocks.createPlayer,
}))
const player = createPlayerFixture()
beforeEach(() => {
  localStorage.clear()
  mocks.createPlayer.mockResolvedValue(player)
})
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})
const createSparseDocument = (otherZ = 20) => {
  const added = addThreeDimensionalParameter({
    document: {...createDemoDocument(), motions: [], parameterBindings: [], parameters: []},
    nodeIds: ['mesh-preview'],
  })!
  return [
    [-20, 12, -10],
    [15, -7, -10],
    [4, 8, otherZ],
  ].reduce(
    (document, [x = 0, y = 0, z = 0]) =>
      insertParameterKeyform({bindingId: added.binding.id, document, values: [x, y, z]})!,
    added.document,
  )
}
const setup = async (otherZ = 20) => {
  const document = createSparseDocument(otherZ)
  const onDocumentChange = vi.fn<(document: PuppetDocument) => void>()
  const view = render(() => (
    <PuppetEditor initialDocument={document} onDocumentChange={onDocumentChange} />
  ))
  await waitFor(() => expect(mocks.createPlayer).toHaveBeenCalledOnce())
  fireEvent.click(view.getByRole('button', {name: 'mesh-preview 레이어 선택'}))
  const setValues = (values: readonly number[]) => {
    for (const [index, axis] of ['X', 'Y', 'Z'].entries()) {
      fireEvent.input(view.getByRole('spinbutton', {name: `Parameter 1 ${axis} 값`}), {
        target: {value: String(values[index])},
      })
    }
  }
  const getValues = () =>
    ['X', 'Y', 'Z'].map((axis) =>
      Number(
        (view.getByRole('spinbutton', {name: `Parameter 1 ${axis} 값`}) as HTMLInputElement).value,
      ),
    )
  const latestDocument = () => onDocumentChange.mock.lastCall?.[0] ?? document
  onDocumentChange.mockClear()
  return {document, getValues, latestDocument, onDocumentChange, setValues, view}
}
const coordinates = (document: PuppetDocument) =>
  document.parameterBindings![0]!.keyforms.map((keyform) => keyform.values)

test('should move a sparse Z plane without changing XY and retain undoable keyforms', async () => {
  const {document, view, setValues, getValues, latestDocument, onDocumentChange} = await setup()
  setValues([12, 7, -10])
  fireEvent.keyDown(view.getByRole('button', {name: 'Parameter 1 Z -10 평면'}), {key: 'ArrowRight'})
  await waitFor(() => expect(getValues()).toEqual([12, 7, -9.5]))
  expect(onDocumentChange).toHaveBeenCalledOnce()
  expect(coordinates(latestDocument())).toEqual(
    expect.arrayContaining([
      [15, -7, -9.5],
      [-20, 12, -9.5],
      [4, 8, 20],
    ]),
  )
  const moved = latestDocument().parameterBindings
  fireEvent.click(view.getByRole('button', {name: '메인 메뉴'}))
  fireEvent.click(screen.getByRole('button', {name: '실행 취소'}))
  expect(latestDocument().parameterBindings).toEqual(document.parameterBindings)
  fireEvent.click(view.getByRole('button', {name: '메인 메뉴'}))
  fireEvent.click(screen.getByRole('button', {name: '다시 실행'}))
  expect(latestDocument().parameterBindings).toEqual(moved)
})

test('should keep current values and history when a destination Z plane is occupied', async () => {
  const {document, view, setValues, getValues, latestDocument, onDocumentChange} = await setup(30)
  setValues([12, 7, -10])
  fireEvent.keyDown(view.getByRole('button', {name: 'Parameter 1 Z -10 평면'}), {key: 'End'})
  expect(getValues()).toEqual([12, 7, -10])
  expect(latestDocument()).toEqual(document)
  expect(onDocumentChange).not.toHaveBeenCalled()
})

test('should move an XY key within its slice and retain keyboard focus and history', async () => {
  const {document, view, setValues, getValues, latestDocument, onDocumentChange} = await setup()
  setValues([-20, 12, -10])
  const marker = view.getByRole('button', {name: '키폼 선택: -20, 12'})
  marker.focus()
  fireEvent.keyDown(marker, {key: 'ArrowRight'})
  await waitFor(() =>
    expect(view.getByRole('button', {name: '키폼 선택: -19.5, 12'})).toHaveFocus(),
  )
  expect(getValues()).toEqual([-19.5, 12, -10])
  expect(onDocumentChange).toHaveBeenCalledOnce()
  expect(coordinates(latestDocument())).toEqual(
    expect.arrayContaining([
      [-19.5, 12, -10],
      [15, -7, -10],
      [4, 8, 20],
    ]),
  )
  fireEvent.click(view.getByRole('button', {name: '메인 메뉴'}))
  fireEvent.click(screen.getByRole('button', {name: '실행 취소'}))
  expect(latestDocument().parameterBindings).toEqual(document.parameterBindings)
})

const pointer = (type: string) => {
  const event = new MouseEvent(type, {bubbles: true, button: 0, clientX: 90, clientY: 30})
  Object.defineProperties(event, {pointerId: {value: 7}, pointerType: {value: 'mouse'}})
  return event
}

test('should commit one XY drag within the current Z and keep other keyforms intact', async () => {
  const {document, view, setValues, getValues, latestDocument, onDocumentChange} = await setup()
  setValues([-20, 12, -10])
  const marker = view.getByRole('button', {name: '키폼 선택: -20, 12'})
  vi.spyOn(marker.parentElement!, 'getBoundingClientRect').mockReturnValue(
    new DOMRect(0, 0, 120, 120),
  )
  marker.dispatchEvent(pointer('pointerdown'))
  globalThis.dispatchEvent(pointer('pointermove'))
  expect(onDocumentChange).not.toHaveBeenCalled()
  globalThis.dispatchEvent(pointer('pointerup'))
  await waitFor(() => expect(view.getByRole('button', {name: '키폼 선택: 15, 15'})).toHaveFocus())
  expect(getValues()).toEqual([15, 15, -10])
  expect(onDocumentChange).toHaveBeenCalledOnce()
  expect(coordinates(latestDocument())).toEqual(
    expect.arrayContaining([
      [15, 15, -10],
      [15, -7, -10],
      [4, 8, 20],
    ]),
  )
  fireEvent.click(view.getByRole('button', {name: '메인 메뉴'}))
  fireEvent.click(screen.getByRole('button', {name: '실행 취소'}))
  expect(latestDocument().parameterBindings).toEqual(document.parameterBindings)
})

test('should reject a volume background menu but add a keyform on the current slice', async () => {
  const {document, view, setValues, getValues, latestDocument, onDocumentChange} = await setup()
  setValues([12, 7, 0])
  const track = view.getByLabelText('Parameter 1 X와 Parameter 1 Y 2차원 키폼 grid')
  // 장식 배경과 좌표 면에는 별도 역할이 없어 의미 있는 트랙 내부에서 지정한다.
  fireEvent.contextMenu(track.querySelector('.parameter-volume-stage')!, {button: 2})
  expect(screen.queryByRole('menu', {name: '키폼 작업'})).toBeNull()
  expect(getValues()).toEqual([12, 7, 0])
  expect(onDocumentChange).not.toHaveBeenCalled()
  const grid = track.querySelector('.parameter-grid')!
  vi.spyOn(grid, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, 120, 120))
  fireEvent.contextMenu(grid, {button: 2, clientX: 60, clientY: 60})
  fireEvent.keyDown(await screen.findByRole('menuitem', {name: '키폼 추가'}), {key: 'Enter'})
  expect(coordinates(latestDocument())).toEqual(
    expect.arrayContaining([...coordinates(document), [0, 0, 0]]),
  )
  expect(latestDocument().parameterBindings![0]!.keyforms).toHaveLength(4)
})
