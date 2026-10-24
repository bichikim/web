/** @vitest-environment jsdom */
import {fireEvent, render, screen, waitFor} from '@solidjs/testing-library'
import {afterEach, beforeEach, expect, test, vi} from 'vitest'
import {createEmptyDocument} from '../../player'
import {createPlayerFixture} from '../../editor/__tests__/fixtures/player'
import {RuntimePage} from '../RuntimePage'

const mocks = vi.hoisted(() => ({createPlayer: vi.fn()}))
vi.mock('../../player', async (original) => ({
  ...(await original<typeof import('../../player')>()),
  createPlayer: mocks.createPlayer,
}))
beforeEach(() => {
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(640)
  vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(480)
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe = vi.fn()
      disconnect = vi.fn()
    },
  )
})
afterEach(() => {
  vi.clearAllMocks()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  sessionStorage.clear()
  localStorage.clear()
})

const renderPage = async () => {
  const player = createPlayerFixture()
  mocks.createPlayer.mockResolvedValue(player)
  const document = {
    ...createEmptyDocument(),
    motions: [
      {duration: 1, id: 'first', tracks: []},
      {duration: 1, id: 'second', tracks: []},
    ],
  }
  const view = render(() => <RuntimePage loadInitialDocument={async () => document} />)
  const pause = await screen.findByRole('button', {name: '일시정지'})
  await waitFor(() => expect(pause).toBeEnabled())
  return {pause, player, view}
}
test('should select motions, pause and resume the player, and release it on unmount', async () => {
  const {pause, player, view} = await renderPage()
  expect(player.setMotion).toHaveBeenCalledWith('first')
  fireEvent.click(pause)
  expect(player.pause).toHaveBeenCalled()
  fireEvent.keyDown(screen.getByRole('button', {name: /모션 선택/}), {key: 'ArrowDown'})
  fireEvent.click(await screen.findByRole('option', {name: 'second'}))
  expect(player.setMotion).toHaveBeenLastCalledWith('second')
  fireEvent.click(screen.getByRole('button', {name: '재생'}))
  expect(player.resume).toHaveBeenCalled()
  view.unmount()
  expect(player.destroy).toHaveBeenCalledOnce()
})
test('should reset and fit the model through the player camera', async () => {
  const {player} = await renderPage()
  fireEvent.click(screen.getByRole('button', {name: '원점 · 100%'}))
  expect(player.setViewCamera).toHaveBeenLastCalledWith({x: 0, y: 0, zoom: 1})
  vi.mocked(player.setViewCamera).mockClear()
  fireEvent.click(screen.getByRole('button', {name: '화면 맞춤'}))
  expect(player.setViewCamera).toHaveBeenLastCalledWith({
    x: expect.closeTo(-32),
    y: expect.closeTo(-24),
    zoom: expect.closeTo(1 / 1.1),
  })
})
test('should update the stage background after committing a color', async () => {
  const {view} = await renderPage()
  const color = screen.getByRole('textbox', {name: '배경색'})
  fireEvent.input(color, {target: {value: '#ffffff'}})
  fireEvent.blur(color)
  expect(view.getByRole('main').style.getPropertyValue('--viewer-background')).toBe('#FFFFFF')
})

test('should disable motion controls for a document without motions', async () => {
  mocks.createPlayer.mockResolvedValue(createPlayerFixture())
  render(() => (
    <RuntimePage loadInitialDocument={async () => ({...createEmptyDocument(), motions: []})} />
  ))
  await screen.findByLabelText('모델 뷰어')
  expect(screen.getByRole('button', {name: '일시정지'})).toBeDisabled()
})

test('should forward manual expression values without a motion preset', async () => {
  const player = createPlayerFixture()
  mocks.createPlayer.mockResolvedValue(player)
  render(() => (
    <RuntimePage
      loadInitialDocument={async () => ({
        ...createEmptyDocument(),
        parameters: [{defaultValue: 0, id: 'mouth', maximum: 1, minimum: 0, name: 'Mouth'}],
      })}
    />
  ))
  const field = await screen.findByRole('spinbutton', {name: 'Mouth 값'})
  await waitFor(() => expect(player.setParameterValues).toHaveBeenCalled())
  fireEvent.input(field, {target: {value: '1'}})
  fireEvent.keyDown(field, {key: 'Enter'})
  expect(player.setParameterValues).toHaveBeenLastCalledWith({mouth: 1})
})

test('should apply and release an imported expression without requiring a motion', async () => {
  const player = createPlayerFixture()
  mocks.createPlayer.mockResolvedValue(player)
  render(() => (
    <RuntimePage
      loadInitialDocument={async () => ({
        ...createEmptyDocument(),
        expressions: [{id: 'Signatures off', parameters: []}],
      })}
    />
  ))
  const selector = await screen.findByRole('button', {name: /표정 선택/})
  await waitFor(() => expect(selector).toBeEnabled())
  fireEvent.keyDown(selector, {key: 'ArrowDown'})
  fireEvent.click(await screen.findByRole('option', {name: 'Signatures off'}))
  expect(player.setExpression).toHaveBeenLastCalledWith('Signatures off')
  fireEvent.keyDown(selector, {key: 'ArrowDown'})
  fireEvent.click(await screen.findByRole('option', {name: '표정 해제'}))
  expect(player.setExpression).toHaveBeenLastCalledWith(undefined)
})

test('should show document loading failures while keeping file import available', async () => {
  render(() => (
    <RuntimePage
      loadInitialDocument={async () => {
        throw new Error('문서 오류')
      }}
    />
  ))
  expect(await screen.findByText('문서 오류')).toBeVisible()
  fireEvent.click(screen.getByRole('button', {name: '메인 메뉴'}))
  expect(screen.getByRole('button', {name: '모델 불러오기'})).toBeVisible()
  expect(screen.getByLabelText('모델 불러오기')).toHaveAttribute('type', 'file')
})

test('should release a player that finishes initialization after the page unmounts', async () => {
  const player = createPlayerFixture()
  let finish: (created: typeof player) => void = () => undefined
  mocks.createPlayer.mockReturnValue(
    new Promise((resolve) => {
      finish = resolve
    }),
  )
  const view = render(() => <RuntimePage loadInitialDocument={async () => createEmptyDocument()} />)
  await waitFor(() => expect(mocks.createPlayer).toHaveBeenCalledOnce())
  view.unmount()
  finish(player)
  await waitFor(() => expect(player.destroy).toHaveBeenCalledOnce())
})
