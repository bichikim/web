/** @vitest-environment jsdom */
import {cleanup, fireEvent, render, waitFor, within} from '@solidjs/testing-library'
import {afterEach, beforeEach, expect, test, vi} from 'vitest'
import {createDemoDocument} from '@winter-love/puppet/player'
import {EditorFixture as PuppetEditor} from './fixtures/Editor'
import {createDeformer} from '../../../../../packages/puppet/src/editor/internal/scene-graph'
import {addParameter} from '../../../../../packages/puppet/src/editor/internal/parameter-keyforms'
import {createPlayerFixture} from '../../__tests__/fixtures/player'

const mocks = vi.hoisted(() => ({createPlayer: vi.fn()}))
const player = createPlayerFixture()
vi.mock('@winter-love/puppet/player', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@winter-love/puppet/player')>()),
  createPlayer: mocks.createPlayer,
}))
const frames = new Map<number, FrameRequestCallback>()
let frameId = 0
const paint = () => {
  const pending = [...frames.values()]
  frames.clear()
  pending.forEach((callback) => callback(0))
}
beforeEach(() => {
  localStorage.clear()
  frames.clear()
  mocks.createPlayer.mockResolvedValue(player)
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    frameId += 1
    frames.set(frameId, callback)
    return frameId
  })
  vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id))
})
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  vi.unstubAllGlobals()
})

test('should highlight the selected layer and hide the previous mesh before preparing its deformer', async () => {
  const document = createDeformer(createDemoDocument(), ['mesh-preview'])!
  const view = render(() => <PuppetEditor initialDocument={document} />)
  await waitFor(() => expect(mocks.createPlayer).toHaveBeenCalled())
  paint()
  const mesh = view.getByLabelText('메시 정점 편집 영역')
  const updates = vi.mocked(player.updateDocument).mock.calls.length
  const layer = view.getByRole('button', {name: '새 자유 변형 디포머 레이어 선택'})
  fireEvent.click(layer)
  expect(layer).toHaveAttribute('aria-pressed', 'true')
  expect(mesh.closest('[aria-hidden]')).toHaveAttribute('aria-hidden', 'true')
  expect(view.queryByLabelText('디포머 편집 영역')).not.toBeInTheDocument()
  expect(player.updateDocument).toHaveBeenCalledTimes(updates)
  paint()
  expect(mesh.closest('[aria-hidden]')).toHaveAttribute('aria-hidden', 'true')
  paint()
  expect(view.getByLabelText('디포머 편집 영역').closest('[aria-hidden]')).toHaveAttribute(
    'aria-hidden',
    'false',
  )
  expect(view.getByRole('complementary', {name: '선택 작업'})).toHaveProperty('inert', false)
})

test('should highlight a parameter card immediately and prepare only the last requested binding', async () => {
  const added = addParameter({document: createDemoDocument(), nodeIds: ['shape-circle']})!
  const view = render(() => <PuppetEditor initialDocument={added.document} />)
  await waitFor(() => expect(mocks.createPlayer).toHaveBeenCalled())
  paint()
  fireEvent.click(view.getByRole('button', {name: '모든 파라미터 보기'}))
  const inspector = view.getByRole('complementary', {name: '선택 작업'})
  const mesh = view.getByLabelText('메시 정점 편집 영역')
  const parameter = view.getByRole('button', {name: 'Parameter 3'})
  fireEvent.click(parameter)
  expect(parameter).toHaveAttribute('aria-pressed', 'true')
  expect(view.getByRole('button', {name: 'Angle X'})).toHaveAttribute('aria-pressed', 'false')
  expect(mesh.closest('[aria-hidden]')).toHaveAttribute('aria-hidden', 'true')
  expect(inspector).toHaveProperty('inert', true)
  expect(within(inspector).queryByText('Parameter 3', {exact: true})).not.toBeInTheDocument()
  paint()
  paint()
  expect(inspector).toHaveProperty('inert', false)
  expect(within(inspector).getByText('Parameter 3', {exact: true})).toBeInTheDocument()
  expect(parameter).toHaveAttribute('aria-pressed', 'true')
})

test('should switch workspace button feedback before preparing the last requested workspace', async () => {
  const view = render(() => <PuppetEditor initialDocument={createDemoDocument()} />)
  await waitFor(() => expect(mocks.createPlayer).toHaveBeenCalled())
  paint()
  const modeling = view.getByRole('region', {name: 'Parameter와 키폼 편집'})
  const animation = view.getByRole('button', {name: '애니메이션'})
  const modelingButton = view.getByRole('button', {name: '모델링'})
  fireEvent.click(animation)
  expect(animation).toHaveAttribute('aria-pressed', 'true')
  expect(modeling).toHaveProperty('inert', true)
  expect(view.queryByRole('button', {name: '타임라인 파라미터 추가'})).not.toBeInTheDocument()
  fireEvent.click(modelingButton)
  fireEvent.click(animation)
  paint()
  expect(modeling).toBeInTheDocument()
  paint()
  expect(view.getByRole('button', {name: '타임라인 파라미터 추가'})).toBeInTheDocument()
  expect(modeling).not.toBeInTheDocument()
  expect(animation).toHaveAttribute('aria-pressed', 'true')
})

test('should cancel a queued card selection when editing the current parameter value', async () => {
  const added = addParameter({document: createDemoDocument(), nodeIds: ['shape-circle']})!
  const view = render(() => <PuppetEditor initialDocument={added.document} />)
  await waitFor(() => expect(mocks.createPlayer).toHaveBeenCalled())
  paint()
  fireEvent.click(view.getByRole('button', {name: '모든 파라미터 보기'}))
  fireEvent.click(view.getByRole('button', {name: 'Parameter 3'}))
  fireEvent.input(view.getByRole('spinbutton', {name: 'Angle X 값'}), {
    target: {value: '15'},
  })
  paint()
  paint()
  expect(view.getByRole('button', {name: 'Angle X'})).toHaveAttribute('aria-pressed', 'true')
  expect(view.getByRole('button', {name: 'Parameter 3'})).toHaveAttribute('aria-pressed', 'false')
  expect(view.getByRole('spinbutton', {name: 'Angle X 값'})).toHaveValue(15)
  expect(view.getByRole('complementary', {name: '선택 작업'})).toHaveProperty('inert', false)
})
