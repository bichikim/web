/** @vitest-environment jsdom */

import {cleanup, fireEvent, render, screen, waitFor, within} from '@solidjs/testing-library'

import {afterEach, beforeEach, describe, expect, test, vi} from 'vitest'

import {composeParameterVertices} from '../../deformation/composition'
import {composeParameterPartProperties} from '../../deformation/part-properties'
import {createDemoDocument, type Player, type PuppetDocument, serializeDocument} from '../../player'
import {sampleMotionParameterValues} from '../../player/internal/motion'

import {addParameter} from '../internal/parameter-keyforms'
import {createSceneGroup} from '../internal/scene-graph'
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
  redraw: vi.fn(),
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
  test('should show part and parameter settings together in the inspector', async () => {
    const source = createDemoDocument()
    const document: PuppetDocument = {
      ...source,
      layerOrderRules: [
        {
          partIds: ['shape-circle'],
          placement: 'before',
          referencePartId: 'mesh-preview',
          when: {comparison: 'greater-than', parameterIds: ['angle-x'], threshold: 10},
        },
      ],
    }
    const view = render(() => <PuppetEditor initialDocument={document} />)
    await waitFor(() => expect(mocks.createPlayer).toHaveBeenCalledOnce())

    fireEvent.click(view.getByRole('button', {name: 'mesh-preview 레이어 선택'}))
    const inspector = view.getByRole('complementary', {name: '선택 작업'})
    expect(within(inspector).getByRole('group', {name: '파트 렌더링'})).toBeInTheDocument()

    fireEvent.click(view.getByRole('button', {name: 'Angle X'}))
    expect(within(inspector).getByRole('group', {name: '파트 렌더링'})).toBeInTheDocument()
    const parameterProperties = within(inspector).getByRole('region', {name: '파라미터 속성'})
    const parameterGroup = within(parameterProperties).getByRole('group', {name: '파라미터'})
    expect(within(parameterGroup).getByRole('group', {name: '영향도'})).toBeInTheDocument()
    expect(within(inspector).getByText('Angle X / Angle Y')).toBeInTheDocument()
    const orderGroup = within(parameterGroup).getByRole('group', {name: '표시 순서'})
    expect(within(orderGroup).getByText('규칙 1개 · 현재 적용 안 됨')).toBeInTheDocument()
    expect(within(parameterGroup).getByText('기준 없음 · 현재 적용량 100%')).toBeInTheDocument()
    expect(within(parameterGroup).getByRole('group', {name: '물리'})).toBeInTheDocument()
    expect(view.queryByRole('button', {name: /표시 순서 1 · 물리/})).toBeNull()

    expect(within(inspector).queryByRole('navigation', {name: '속성 대상'})).toBeNull()
  })

  test.each(['mesh-preview', 'shape-circle'])(
    'should preview manual values without motion overrides while selecting %s',
    async (selectedPartId) => {
      const source = createDemoDocument()
      const document: PuppetDocument = {
        ...source,
        motions: source.motions.filter((motion) => motion.id === 'blink'),
        parameterBindings: [
          {
            ...source.parameterBindings![0]!,
            keyforms: source.parameterBindings![0]!.keyforms.map((keyform) => ({
              ...keyform,
              parts: keyform.parts.map((part) => ({
                ...part,
                properties: {opacity: 1 - Math.max(0, keyform.values[0]) / 30},
              })),
              values: [keyform.values[0], keyform.values[1] ?? 0] as const,
            })),
            parameterIds: ['angle-x', 'angle-y'],
          },
        ],
      }
      const onDocumentChange = vi.fn()
      const view = render(() => (
        <PuppetEditor initialDocument={document} onDocumentChange={onDocumentChange} />
      ))
      await waitFor(() => expect(mocks.createPlayer).toHaveBeenCalledOnce())
      onDocumentChange.mockClear()
      fireEvent.click(view.getByRole('button', {name: `${selectedPartId} 레이어 선택`}))
      fireEvent.click(view.getByRole('button', {name: '모든 파라미터 보기'}))
      fireEvent.input(view.getByRole('spinbutton', {name: 'Angle X 값'}), {
        target: {value: '15'},
      })

      const manual = {'angle-x': 15, 'angle-y': 0}
      await waitFor(() =>
        expect(player.setParameterValues).toHaveBeenLastCalledWith(expect.objectContaining(manual)),
      )
      const preview = vi.mocked(player.updateDocument).mock.lastCall![0]
      const values = sampleMotionParameterValues({
        motion: preview.motions[0],
        parameterValues: vi.mocked(player.setParameterValues).mock.lastCall![0],
        time: 0,
      })
      const part = document.parts[0]!
      expect(values).toMatchObject(manual)
      expect(
        composeParameterVertices({
          document: preview,
          parameterValues: values,
          partId: part.id,
          restVertices: part.mesh.vertices,
        }),
      ).toEqual(
        composeParameterVertices({
          document,
          parameterValues: manual,
          partId: part.id,
          restVertices: part.mesh.vertices,
        }),
      )
      expect(
        composeParameterPartProperties({
          document: preview,
          parameterValues: values,
          partId: part.id,
        }).opacity,
      ).toBe(0.5)

      fireEvent.click(view.getByRole('button', {name: '애니메이션'}))
      await waitFor(() =>
        expect(vi.mocked(player.updateDocument).mock.lastCall![0].motions).toEqual(
          document.motions,
        ),
      )
      fireEvent.click(view.getByRole('button', {name: '모델링'}))
      await waitFor(() =>
        expect(vi.mocked(player.updateDocument).mock.lastCall![0].motions).toEqual([]),
      )
      expect(view.getByRole('spinbutton', {name: 'Angle X 값'})).toHaveValue(15)
      expect(onDocumentChange).not.toHaveBeenCalled()
    },
  )

  test('should show the union of parameters connected to selected layers', async () => {
    const added = addParameter({document: createDemoDocument(), nodeIds: ['shape-circle']})!
    const view = render(() => <PuppetEditor initialDocument={added.document} />)

    expect(view.getByRole('button', {name: 'Angle X'})).toBeVisible()
    expect(view.queryByRole('button', {name: 'Parameter 3'})).toBeNull()

    fireEvent.click(view.getByRole('button', {name: 'shape-circle 레이어 선택'}))

    await waitFor(() => {
      expect(view.queryByRole('button', {name: 'Angle X'})).toBeNull()
      expect(view.getByRole('button', {name: 'Parameter 3'})).toHaveAttribute(
        'aria-pressed',
        'true',
      )
    })

    fireEvent.click(view.getByRole('button', {name: 'mesh-preview 레이어 선택'}), {ctrlKey: true})

    expect(view.getByRole('button', {name: 'Angle X'})).toBeVisible()
    expect(view.getByRole('button', {name: 'Parameter 3'})).toBeVisible()

    fireEvent.click(view.getByRole('button', {name: 'shape-diamond 레이어 선택'}))

    await waitFor(() => {
      expect(view.queryByRole('button', {name: 'Angle X'})).toBeNull()
      expect(view.queryByRole('button', {name: 'Parameter 3'})).toBeNull()
    })
  })

  test('should connect multiple selected parts to the active parameter', async () => {
    const onDocumentChange = vi.fn()
    mocks.createPlayer.mockResolvedValue(player)
    const view = render(() => (
      <PuppetEditor initialDocument={createDemoDocument()} onDocumentChange={onDocumentChange} />
    ))

    fireEvent.click(view.getByRole('button', {name: 'shape-circle 레이어 선택'}), {ctrlKey: true})
    fireEvent.click(view.getByRole('button', {name: 'shape-diamond 레이어 선택'}), {ctrlKey: true})
    expect(view.getByText('대상 1 · 선택 3개 노드')).toBeVisible()
    expect(
      view.container.querySelector('.mesh-editor [data-part-id="mesh-preview"]'),
    ).not.toBeNull()
    expect(
      view.container.querySelector('.mesh-editor [data-part-id="shape-circle"]'),
    ).not.toBeNull()
    expect(
      view.container.querySelector('.mesh-editor [data-part-id="shape-diamond"]'),
    ).not.toBeNull()
    expect(view.container.querySelectorAll('.mesh-editor circle')).toHaveLength(23)

    fireEvent.click(view.getByRole('button', {name: '선택 레이어 연결'}))

    await waitFor(() => {
      const document = onDocumentChange.mock.calls.at(-1)?.[0]
      expect(document?.parameterBindings?.[0]?.targetPartIds).toEqual([
        'mesh-preview',
        'shape-circle',
        'shape-diamond',
      ])
    })
    const modelingPanel = view.getByRole('region', {name: 'Parameter와 키폼 편집'})
    expect(within(modelingPanel).getAllByText('Angle X').length).toBeGreaterThan(0)
    expect(view.getByRole('button', {name: '선택 레이어 연결'})).toBeDisabled()

    fireEvent.click(view.getByRole('button', {name: 'shape-circle 레이어 선택'}))
    fireEvent.click(view.getByRole('button', {name: 'shape-diamond 레이어 선택'}), {ctrlKey: true})
    fireEvent.click(view.getByRole('button', {name: '선택 레이어 연결 해제'}))
    await waitFor(() => {
      const document = onDocumentChange.mock.calls.at(-1)?.[0]
      expect(document?.parameterBindings?.[0]?.targetPartIds).toEqual(['mesh-preview'])
    })
  })

  test('should edit original keyform properties below full influence and preserve the influence relation', async () => {
    const onDocumentChange = vi.fn<(document: PuppetDocument) => void>()
    const view = render(() => (
      <PuppetEditor initialDocument={createDemoDocument()} onDocumentChange={onDocumentChange} />
    ))
    fireEvent.click(view.getByRole('button', {name: 'Angle X'}))
    const inspector = view.getByRole('complementary', {name: '선택 작업'})
    expect(within(inspector).getByRole('region', {name: '파라미터 속성'})).toBeInTheDocument()
    expect(within(inspector).getByRole('group', {name: '영향도'})).toBeInTheDocument()
    fireEvent.click(view.getByRole('button', {name: 'Angle X / Angle Y · 영향도 설정'}))
    fireEvent.click(view.getByRole('button', {name: '기준 추가'}))
    expect(view.getByRole('spinbutton', {name: '파트 불투명도'})).toBeEnabled()
    expect(view.getByRole('textbox', {name: '파트 곱하기 색상'})).toBeEnabled()
    fireEvent.input(view.getByRole('spinbutton', {name: '파트 불투명도'}), {target: {value: '0.4'}})
    const blend = view.getByRole('button', {name: /^파트 블렌드 모드/})
    expect(blend).toBeEnabled()
    fireEvent.keyDown(blend, {key: 'Enter'})
    fireEvent.keyDown(screen.getByRole('option', {name: 'screen'}), {key: 'Enter'})
    const inverted = view.getByRole('checkbox', {name: '마스크 반전'})
    expect(inverted).toBeEnabled()
    fireEvent.click(inverted)
    expect(view.getByRole('button', {name: '대상 추가'})).toBeEnabled()
    expect(view.getByRole('button', {name: '레이어에서 선택'})).toBeEnabled()
    await waitFor(() => {
      const document = onDocumentChange.mock.calls.at(-1)?.[0]
      expect(document?.parts[0]?.properties?.blendMode).toBe('screen')
      expect(document?.parts[0]?.properties?.invertedMask).toBe(true)
      const binding = document?.parameterBindings?.[0]
      expect(binding?.influences).toHaveLength(1)
      expect(
        binding?.keyforms.find((keyform) => keyform.values.every((value) => value === 0))?.parts[0]
          ?.properties?.opacity,
      ).toBeCloseTo(0.4)
    })
    expect(view.getByRole('spinbutton', {name: '파트 불투명도'})).toBeEnabled()
  })
})
