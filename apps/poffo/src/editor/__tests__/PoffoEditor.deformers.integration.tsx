/** @vitest-environment jsdom */

import {waitForSelectionReady} from '../../../../../packages/puppet/src/editor/__tests__/fixtures/selection'

import {createPlayerFixture} from '../../__tests__/fixtures/player'

import {cleanup, fireEvent, render, screen, within} from '@solidjs/testing-library'

import {afterEach, beforeEach, describe, expect, test, vi} from 'vitest'

import {createDemoDocument, type createPlayer} from '@winter-love/puppet/player'

import {createDeformer} from '../../../../../packages/puppet/src/editor/internal/scene-graph'
import {EditorFixture as PuppetEditor} from './fixtures/Editor'

const mocks = vi.hoisted(() => ({
  autoMeshPart: vi.fn(),
  createPlayer: vi.fn<typeof createPlayer>(),
  importPng: vi.fn(),
  readTexturePixels: vi.fn(),
}))
const player = createPlayerFixture()

vi.mock('@winter-love/puppet/player', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@winter-love/puppet/player')>()),
  createPlayer: mocks.createPlayer,
}))

vi.mock('../../../../../packages/puppet/src/editor/import-png', async (importOriginal) => ({
  ...(await importOriginal<
    typeof import('../../../../../packages/puppet/src/editor/import-png')
  >()),
  importPng: mocks.importPng,
}))

vi.mock('../../../../../packages/puppet/src/editor/auto-mesh-part', async (importOriginal) => ({
  ...(await importOriginal<
    typeof import('../../../../../packages/puppet/src/editor/auto-mesh-part')
  >()),
  autoMeshPart: mocks.autoMeshPart,
}))

vi.mock('../../../../../packages/puppet/src/editor/internal/read-texture-pixels', () => ({
  readTexturePixels: mocks.readTexturePixels,
}))

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

beforeEach(() => {
  localStorage.clear()
  mocks.createPlayer.mockResolvedValue(player)
})

describe('PuppetEditor', () => {
  test.each(['자유 변형 디포머', '회전 디포머', '본 디포머', '핀 디포머'])(
    'should keep %s mode switches in the bottom toolbar and restore part controls on selection',
    async (kind) => {
      const view = render(() => <PuppetEditor initialDocument={createDemoDocument()} />)
      fireEvent.click(view.getByRole('button', {name: '그룹'}))
      await waitForSelectionReady()
      fireEvent.keyDown(view.getByRole('button', {name: '새 그룹 종류 변경'}), {key: 'Enter'})
      fireEvent.keyDown(await screen.findByRole('menuitemradio', {name: kind}), {key: 'Enter'})

      const bottom = within(view.getByRole('region', {name: 'Parameters'}))
      const inspector = within(view.getByRole('complementary', {name: '선택 작업'}))
      const mode = within(bottom.getByRole('group', {name: '디포머 편집 방식'}))
      expect(inspector.queryByRole('group', {name: '디포머 편집 방식'})).toBeNull()
      fireEvent.click(mode.getByRole('button', {name: '기준 배치'}))
      expect(mode.getByRole('button', {name: '기준 배치'})).toHaveAttribute('aria-pressed', 'true')
      fireEvent.click(mode.getByRole('button', {name: '변형 편집'}))
      expect(mode.getByRole('button', {name: '변형 편집'})).toHaveAttribute('aria-pressed', 'true')

      fireEvent.click(view.getByRole('button', {name: 'mesh-preview 레이어 선택'}))
      await waitForSelectionReady()
      expect(bottom.queryByRole('group', {name: '디포머 편집 방식'})).toBeNull()
      expect(bottom.getByRole('group', {name: '정점 편집 방식'})).toBeVisible()
    },
  )

  test('should show mesh vertices for a part but hide them when its deformer is selected', async () => {
    const document = createDeformer(createDemoDocument(), ['mesh-preview'])!
    const view = render(() => <PuppetEditor initialDocument={document} />)
    const mesh = () => view.queryByLabelText('메시 정점 편집 영역')

    fireEvent.click(view.getByRole('button', {name: 'mesh-preview 레이어 선택'}))
    await waitForSelectionReady()
    expect(mesh()).toBeInTheDocument()

    fireEvent.click(view.getByRole('button', {name: '새 자유 변형 디포머 레이어 선택'}))
    await waitForSelectionReady()
    expect(mesh()).not.toBeInTheDocument()
    fireEvent.click(view.getByRole('button', {name: '영향도 편집'}))
    expect(view.getByLabelText('디포머 영향도 정점 선택')).toBeInTheDocument()
    expect(mesh()).not.toBeInTheDocument()

    fireEvent.click(view.getByRole('button', {name: 'mesh-preview 레이어 선택'}))
    await waitForSelectionReady()
    expect(mesh()).toBeInTheDocument()
  })

  test('should hold a bound deformer edit between keys without changing the document', async () => {
    mocks.createPlayer.mockResolvedValue(player)
    const onDocumentChange = vi.fn()
    const view = render(() => (
      <PuppetEditor initialDocument={createDemoDocument()} onDocumentChange={onDocumentChange} />
    ))
    fireEvent.click(view.getByRole('button', {name: '그룹'}))
    await waitForSelectionReady()
    fireEvent.keyDown(view.getByRole('button', {name: '새 그룹 종류 변경'}), {key: 'Enter'})
    fireEvent.keyDown(await screen.findByRole('menuitemradio', {name: '자유 변형 디포머'}), {
      key: 'Enter',
    })
    fireEvent.click(view.getByRole('button', {name: '1차원 Parameter 추가'}))
    fireEvent.input(view.getByRole('spinbutton', {name: 'Parameter 3 값'}), {target: {value: '30'}})
    const track = view.getByLabelText('Parameter 3 키폼 트랙')
    vi.spyOn(track, 'getBoundingClientRect').mockReturnValue(new DOMRect(100, 0, 200, 40))
    fireEvent.dblClick(track, {clientX: 300})
    fireEvent.input(view.getByRole('spinbutton', {name: 'Parameter 3 값'}), {target: {value: '15'}})
    const before = onDocumentChange.mock.calls.at(-1)![0]
    fireEvent.input(view.getByRole('spinbutton', {name: '자유 변형 각도'}), {target: {value: '25'}})
    expect(view.getByRole('button', {name: '임시 변경'})).toBeVisible()
    expect(
      (view.getByRole('spinbutton', {name: '자유 변형 각도'}) as HTMLInputElement).valueAsNumber,
    ).toBeCloseTo(25)
    expect(onDocumentChange.mock.calls.at(-1)![0]).toBe(before)
    fireEvent.input(view.getByRole('spinbutton', {name: '자유 변형 각도'}), {target: {value: '40'}})
    fireEvent.input(view.getByRole('spinbutton', {name: 'Parameter 3 값'}), {target: {value: '30'}})
    expect(
      (view.getByRole('spinbutton', {name: '자유 변형 각도'}) as HTMLInputElement).valueAsNumber,
    ).toBeCloseTo(0)
    fireEvent.mouseEnter(view.getByRole('button', {name: '임시 변경'}))
    expect(
      (view.getByRole('spinbutton', {name: '자유 변형 각도'}) as HTMLInputElement).valueAsNumber,
    ).toBeCloseTo(40)
    fireEvent.mouseLeave(view.getByRole('button', {name: '임시 변경'}))
    expect(
      (view.getByRole('spinbutton', {name: '자유 변형 각도'}) as HTMLInputElement).valueAsNumber,
    ).toBeCloseTo(0)
    fireEvent.click(view.getByRole('button', {name: '임시 변경 삭제'}))
    fireEvent.click(view.getByRole('button', {name: '진짜 삭제?'}))
    expect(view.queryByRole('button', {name: '임시 변경'})).not.toBeInTheDocument()
    expect(onDocumentChange.mock.calls.at(-1)![0]).toBe(before)
  })
})
