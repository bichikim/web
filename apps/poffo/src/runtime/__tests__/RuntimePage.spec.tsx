/** @vitest-environment jsdom */
import {fireEvent, render, screen, waitFor, within} from '@solidjs/testing-library'
import {afterEach, beforeEach, expect, test, vi} from 'vitest'
import {createEmptyDocument, serializeDocument} from '@winter-love/puppet/player'
import {createPlayerFixture} from '../../__tests__/fixtures/player'
import {RuntimeFixture as RuntimePage} from './fixtures/Runtime'

const mocks = vi.hoisted(() => ({createPlayer: vi.fn()}))
vi.mock('@winter-love/puppet/player', async (original) => ({
  ...(await original<typeof import('@winter-love/puppet/player')>()),
  createPlayer: mocks.createPlayer,
}))
vi.mock('../graph/MappingGraph', () => ({MappingGraph: () => null}))

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

const renderPage = async (mode: 'studio' | 'viewer' = 'viewer') => {
  const player = createPlayerFixture()
  mocks.createPlayer.mockResolvedValue(player)
  const document = {
    ...createEmptyDocument(),
    motions: [
      {duration: 1, id: 'first', tracks: []},
      {duration: 1, id: 'second', tracks: []},
    ],
  }
  const view = render(() => <RuntimePage mode={mode} loadInitialDocument={async () => document} />)
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
test('should reset and fit the model through the shared viewport camera', async () => {
  const {view} = await renderPage()
  const viewport = view.getByRole('region', {name: '모델 보기'})
  fireEvent.click(view.getByRole('button', {name: '원점 · 100%'}))
  expect(viewport.style.getPropertyValue('--camera-zoom')).toBe('1')
  expect(viewport.style.getPropertyValue('--camera-x')).toBe('0px')
  fireEvent.click(view.getByRole('button', {name: '화면 맞춤'}))
  expect(Number(viewport.style.getPropertyValue('--camera-zoom'))).toBeCloseTo(1)
  expect(view.getByLabelText('가로 좌표 자')).toBeInTheDocument()
  expect(view.getByLabelText('세로 좌표 자')).toBeInTheDocument()
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

test('should keep file import available after a document import fails', async () => {
  const {view} = await renderPage()
  fireEvent.click(view.getByRole('button', {name: '메인 메뉴'}))
  const file = new File([], 'broken.json', {type: 'application/json'})
  Object.defineProperty(file, 'text', {value: async () => '{}'})
  const input = view.getByLabelText('모델 불러오기')
  fireEvent.click(view.getByRole('button', {name: '모델 불러오기'}))
  fireEvent.change(input, {target: {files: [file]}})
  const dialog = screen.getByRole('dialog', {name: '불러오는 중…'})
  expect(await view.findByText('올바른 Puppet JSON 문서를 선택하세요.')).toBeVisible()
  expect(dialog).toHaveAttribute('data-closed')
  fireEvent.click(view.getByRole('button', {name: '메인 메뉴'}))
  expect(view.getByRole('button', {name: '모델 불러오기'})).toBeVisible()
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

test('should keep studio file commands out of the viewer menu', async () => {
  const {view} = await renderPage()
  fireEvent.click(view.getByRole('button', {name: '메인 메뉴'}))
  expect(view.getByRole('button', {name: '모델 불러오기'})).toBeVisible()
  expect(view.queryByRole('button', {name: '스튜디오 저장'})).not.toBeInTheDocument()
  expect(view.queryByRole('button', {name: '스튜디오 불러오기'})).not.toBeInTheDocument()
})

test.each(['studio', 'viewer'] as const)(
  'should show the shared loading dialog until a %s model import completes',
  async (mode) => {
    const {view, player} = await renderPage(mode)
    let finish: (text: string) => void = () => undefined
    const source = new Promise<string>((resolve) => {
      finish = resolve
    })
    const file = new File([], 'loading-cat.json', {type: 'application/json'})
    Object.defineProperty(file, 'text', {value: () => source})
    fireEvent.click(view.getByRole('button', {name: '메인 메뉴'}))
    const input = view.getByLabelText('모델 불러오기')
    fireEvent.click(view.getByRole('button', {name: '모델 불러오기'}))
    fireEvent.change(input, {target: {files: [file]}})
    const dialog = screen.getByRole('dialog', {name: '불러오는 중…'})
    expect(dialog).toBeVisible()
    expect(within(dialog).getByText('loading-cat.json')).toBeVisible()
    finish(serializeDocument({...createEmptyDocument(), framesPerSecond: 48}))
    await waitFor(() => expect(dialog).toHaveAttribute('data-closed'))
    await waitFor(() =>
      expect(player.updateDocument).toHaveBeenCalledWith(
        expect.objectContaining({framesPerSecond: 48}),
        expect.any(Object),
      ),
    )
  },
)

test.each(['studio', 'viewer'] as const)(
  'should cancel a %s model import from the loading dialog without replacing the player',
  async (mode) => {
    const {view} = await renderPage(mode)
    let finish: (text: string) => void = () => undefined
    const source = new Promise<string>((resolve) => {
      finish = resolve
    })
    const file = new File([], 'cancelled-cat.json', {type: 'application/json'})
    Object.defineProperty(file, 'text', {value: () => source})
    const created = mocks.createPlayer.mock.calls.length
    fireEvent.click(view.getByRole('button', {name: '메인 메뉴'}))
    const input = view.getByLabelText('모델 불러오기')
    fireEvent.click(view.getByRole('button', {name: '모델 불러오기'}))
    fireEvent.change(input, {target: {files: [file]}})
    const dialog = screen.getByRole('dialog', {name: '불러오는 중…'})
    const overlay = dialog.previousElementSibling
    const cancel = within(dialog).getByRole('button', {name: '취소'})
    fireEvent.click(cancel)
    expect(dialog).toHaveAttribute('data-closed')
    // JSDOM has no editor CSS; complete the primitive's exit animation.
    const animationEnd = new Event('animationend', {bubbles: true})
    Object.defineProperty(animationEnd, 'animationName', {value: ''})
    dialog.dispatchEvent(animationEnd)
    overlay?.dispatchEvent(animationEnd)
    finish(serializeDocument({...createEmptyDocument(), framesPerSecond: 48}))
    await waitFor(() => expect(view.getByRole('button', {name: '일시정지'})).toBeEnabled())
    expect(mocks.createPlayer).toHaveBeenCalledTimes(created)
    expect(view.queryByText('올바른 Puppet JSON 문서를 선택하세요.')).not.toBeInTheDocument()
  },
)
