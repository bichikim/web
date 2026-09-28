/** @vitest-environment jsdom */

import {cleanup, fireEvent, render, screen} from '@solidjs/testing-library'

import {afterEach, beforeEach, describe, expect, test, vi} from 'vitest'

import {createDemoDocument, type Player} from '../../player'

import {createDeformer} from '../internal/scene-graph'
import {PuppetEditor} from '../PuppetEditor'

const mocks = vi.hoisted(() => ({
  autoMeshPart: vi.fn(),
  createPlayer: vi.fn(),
  importPng: vi.fn(),
  readTexturePixels: vi.fn(),
}))
const player: Player = {
  destroy: vi.fn(),
  pause: vi.fn(),
  play: vi.fn(),
  playMotion: vi.fn(() => true),
  resetPhysics: vi.fn(),
  resize: vi.fn(),
  seek: vi.fn(),
  setMotion: vi.fn(() => true),
  setParameterValues: vi.fn(),
  setPhysicsPreview: vi.fn(),
  updateDocument: vi.fn(() => true),
}

vi.mock('../../player', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../player')>()),
  createPlayer: mocks.createPlayer,
}))

vi.mock('../import-png', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../import-png')>()),
  importPng: mocks.importPng,
}))

vi.mock('../auto-mesh-part', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../auto-mesh-part')>()),
  autoMeshPart: mocks.autoMeshPart,
}))

vi.mock('../internal/read-texture-pixels', () => ({
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
  test('should show mesh vertices for a part but hide them when its deformer is selected', () => {
    const document = createDeformer(createDemoDocument(), ['mesh-preview'])!
    const view = render(() => <PuppetEditor initialDocument={document} />)
    const mesh = () => view.queryByLabelText('메시 정점 편집 영역')

    fireEvent.click(view.getByRole('button', {name: 'mesh-preview 레이어 선택'}))
    expect(mesh()).toBeInTheDocument()

    fireEvent.click(view.getByRole('button', {name: '새 자유 변형 디포머 레이어 선택'}))
    expect(mesh()).not.toBeInTheDocument()
    fireEvent.click(view.getByRole('button', {name: '영향도 편집'}))
    expect(view.getByLabelText('디포머 영향도 정점 선택')).toBeInTheDocument()
    expect(mesh()).not.toBeInTheDocument()

    fireEvent.click(view.getByRole('button', {name: 'mesh-preview 레이어 선택'}))
    expect(mesh()).toBeInTheDocument()
  })

  test('should hold a bound deformer edit between keys without changing the document', async () => {
    mocks.createPlayer.mockResolvedValue(player)
    const onDocumentChange = vi.fn()
    const view = render(() => (
      <PuppetEditor initialDocument={createDemoDocument()} onDocumentChange={onDocumentChange} />
    ))
    fireEvent.click(view.getByRole('button', {name: '그룹'}))
    fireEvent.keyDown(view.getByRole('button', {name: '새 그룹 종류 변경'}), {key: 'Enter'})
    fireEvent.keyDown(await screen.findByRole('menuitemradio', {name: '자유 변형 디포머'}), {
      key: 'Enter',
    })
    fireEvent.click(view.getByRole('button', {name: '1차원 Parameter 추가'}))
    fireEvent.input(view.getByRole('spinbutton', {name: 'Parameter 3 값'}), {target: {value: '30'}})
    fireEvent.click(view.getByRole('button', {name: '현재 값에 키폼'}))
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
