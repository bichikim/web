import {expect, test} from 'vitest'
import {
  createDemoDocument,
  getDocumentScene,
  type PuppetDocument,
  type PuppetParameterBinding1D,
  type PuppetPartRenderProperties,
} from '../../player'
import {getDocumentChangeTitle} from '../get-document-change-title'
import {isTwoDimensionalParameterBinding} from '../../deformation'
import {
  setParameterKeyformPartProperties,
  setPartRenderProperties,
} from '../internal/part-properties'
import {createDeformer, renameSceneNode, setSceneNodeState} from '../internal/scene-graph'

const initial = createDemoDocument()
interface TitleCase {
  readonly title: string
  readonly document: PuppetDocument
}
const cases: ReadonlyArray<TitleCase> = [
  {
    document: {
      ...initial,
      parameters: [
        ...(initial.parameters ?? []),
        {defaultValue: 0, id: 'new', maximum: 1, minimum: -1, name: 'New'},
      ],
    },
    title: '파라미터 추가',
  },
  {document: {...initial, parameters: []}, title: '파라미터 삭제'},
  {
    document: {
      ...initial,
      parameters: initial.parameters?.map((parameter) => ({...parameter, defaultValue: 0.5})),
    },
    title: '파라미터 설정 변경',
  },
  {document: {...initial, parts: []}, title: '파츠 삭제'},
  {
    document: {
      ...initial,
      parts: initial.parts.map((part) => ({
        ...part,
        mesh: {...part.mesh, vertices: part.mesh.vertices.map((value) => value + 1)},
      })),
    },
    title: 'mesh-preview 외 2개 · 메시 편집',
  },
  {
    document: {
      ...initial,
      parts: initial.parts.map((part) => ({
        ...part,
        properties: {...part.properties, opacity: 0.5},
      })),
    },
    title: 'mesh-preview 외 2개 · 불투명도 변경',
  },
  {
    document: {
      ...initial,
      scene: {roots: getDocumentScene(initial).roots.map((node) => ({...node, name: 'Renamed'}))},
    },
    title: 'Renamed 외 1개 · 이름 변경',
  },
  {
    document: {
      ...initial,
      scene: {roots: getDocumentScene(initial).roots.map((node) => ({...node, visible: false}))},
    },
    title: 'mesh-preview 외 1개 · 표시 변경',
  },
  {
    document: {
      ...initial,
      scene: {roots: getDocumentScene(initial).roots.map((node) => ({...node, locked: true}))},
    },
    title: 'mesh-preview 외 1개 · 잠금 변경',
  },
  {document: {...initial, motions: []}, title: '모션 삭제'},
  {
    document: {
      ...initial,
      motions: initial.motions.map((motion) => ({...motion, duration: motion.duration + 1})),
    },
    title: '모션·키프레임 편집',
  },
  {document: {...initial, parameterBindings: []}, title: '키폼 편집'},
  {document: {...initial, framesPerSecond: 30}, title: '프레임 속도 변경'},
  {document: {...initial, viewport: {...initial.viewport, width: 900}}, title: '캔버스 크기 변경'},
  {document: {...initial}, title: '문서 편집'},
]

test.each(cases)('should title $title from the changed document', ({document, title}) => {
  expect(getDocumentChangeTitle(initial, document)).toBe(title)
})

const named = renameSceneNode(
  {...initial, parts: initial.parts.map((part) => ({...part, properties: undefined}))},
  'mesh-preview',
  '앞머리',
)!
const propertyCases: ReadonlyArray<{
  readonly properties: PuppetPartRenderProperties
  readonly title: string
}> = [
  {properties: {opacity: 0.5}, title: '불투명도 변경'},
  {properties: {blendMode: 'multiply'}, title: '블렌드 모드 변경'},
  {properties: {multiplyColor: [0.5, 1, 1]}, title: '곱하기 색상 변경'},
  {properties: {screenColor: [0.5, 0, 0]}, title: '스크린 색상 변경'},
  {properties: {clippingMaskIds: ['shape-circle']}, title: '마스크 적용 대상 변경'},
  {properties: {invertedMask: true}, title: '마스크 반전 변경'},
  {properties: {renderWhenUsedAsMask: false}, title: '마스크 사용 시 파츠 표시 변경'},
  {
    properties: {multiplyColor: [0.5, 1, 1], opacity: 0.5},
    title: '불투명도 변경, 곱하기 색상 변경',
  },
]

test.each(propertyCases)('should name the part and changed $title', ({properties, title}) => {
  const after = setPartRenderProperties({document: named, partId: 'mesh-preview', properties})!
  expect(getDocumentChangeTitle(named, after)).toBe(`앞머리 · ${title}`)
})

test.each([
  {properties: {opacity: 0.5}, title: '불투명도 변경'},
  {properties: {multiplyColor: [0.5, 1, 1] as const}, title: '곱하기 색상 변경'},
  {properties: {screenColor: [0.5, 0, 0] as const}, title: '스크린 색상 변경'},
])('should identify $title inside a keyform', ({properties, title}) => {
  const after = setParameterKeyformPartProperties({
    bindingId: 'angle-xy',
    document: named,
    partId: 'mesh-preview',
    properties,
    values: [0, 0],
  })!
  expect(getDocumentChangeTitle(named, after)).toBe(`앞머리 · ${title} (키폼)`)
})

test('should identify keyform vertices by values and part ID after reordering', () => {
  const after: PuppetDocument = {
    ...named,
    parameterBindings: named.parameterBindings
      ?.filter(isTwoDimensionalParameterBinding)
      .map((binding) => ({
        ...binding,
        keyforms: binding.keyforms.toReversed().map((keyform) => ({
          ...keyform,
          parts: keyform.parts.map((part) => ({
            ...part,
            vertices: part.vertices.map((value) => value + 1),
          })),
        })),
      })),
  }
  expect(getDocumentChangeTitle(named, after)).toBe('앞머리 · 메시 편집 (키폼)')
})

test('should name a nested part when changing layer visibility', () => {
  const before = renameSceneNode(named, 'shape-circle', '눈')!
  const after = setSceneNodeState({document: before, nodeId: 'shape-circle', visible: false})!
  expect(getDocumentChangeTitle(before, after)).toBe('눈 · 표시 변경')
})

test('should fall back to the part ID without a named scene', () => {
  const before = {...initial, scene: undefined}
  const after = setPartRenderProperties({
    document: before,
    partId: 'shape-circle',
    properties: {opacity: 0.5},
  })!
  expect(getDocumentChangeTitle(before, after)).toBe('shape-circle · 불투명도 변경')
})

test('should ignore cloned property values when identifying the actual changed part', () => {
  const before = setPartRenderProperties({
    document: named,
    partId: 'shape-circle',
    properties: {multiplyColor: [0.5, 1, 1]},
  })!
  const after: PuppetDocument = {
    ...before,
    parts: before.parts.map((part) => ({
      ...part,
      properties: {
        ...part.properties,
        ...(part.id === 'mesh-preview' ? {opacity: 0.5} : {}),
        ...(part.id === 'shape-circle' ? {multiplyColor: [0.5, 1, 1] as const} : {}),
      },
    })),
  }
  expect(getDocumentChangeTitle(before, after)).toBe('앞머리 · 불투명도 변경')
})

test('should name the deformer and changed rotation origin', () => {
  const before = createDeformer(named, ['mesh-preview'])!
  const deformer = getDocumentScene(before).roots.find((node) => node.kind === 'deformer')!
  const after: PuppetDocument = {
    ...before,
    scene: {
      roots: getDocumentScene(before).roots.map((node) =>
        node.id === deformer.id ? {...node, rotationOrigin: {x: 24, y: 16}} : node,
      ),
    },
  }
  expect(getDocumentChangeTitle(before, after)).toBe(`${deformer.name} · 회전 중심 변경`)
})

test('should name a deformer and its changed 3D pose in a keyform', () => {
  const document = createDeformer(named, ['mesh-preview'])!
  const deformer = getDocumentScene(document).roots.find((node) => node.kind === 'deformer')!
  const binding: PuppetParameterBinding1D = {
    id: 'pose',
    keyforms: [
      {
        deformers: [
          {
            controlPoints: deformer.controlPoints,
            kind: 'deformer',
            nodeId: deformer.id,
            spatialTranslation: [0, 0, 0],
          },
        ],
        parts: [],
        values: [0],
      },
    ],
    parameterIds: ['angle-x'],
    targetDeformerIds: [deformer.id],
  }
  const before = {...document, parameterBindings: [binding]}
  const after: PuppetDocument = {
    ...before,
    parameterBindings: [
      {
        ...binding,
        keyforms: binding.keyforms.map((keyform) => ({
          ...keyform,
          deformers: keyform.deformers?.map((node) => ({...node, spatialTranslation: [24, 0, 0]})),
        })),
      },
    ],
  }
  expect(getDocumentChangeTitle(before, after)).toBe(`${deformer.name} · 3D 이동 변경 (키폼)`)
})
