/** @vitest-environment jsdom */
import {fireEvent, render} from '@solidjs/testing-library'
import {expect, test, vi} from 'vitest'
import example from '../../../../examples/rotation-skinning.json'
import {parseDocument} from '../../../player'
import {
  PUPPET_DOCUMENT_FORMAT,
  PUPPET_DOCUMENT_VERSION,
  type PuppetDocument,
} from '../../../player/document'
import {createSkinBinding} from '../../../deformation/skinning'
import {composeParameterScene} from '../../../deformation/scene'
import {applySceneNodeDeformers} from '../../../deformation/vertices'
import {useDocumentHistory} from '../../use-document-history'
import {setPartSkinning} from '../skinning'
import {findNode} from '../scene-tree'
import {SkinningTools} from '../SkinningTools'

vi.mock('../SkinningJoints', () => ({SkinningJoints: () => null}))

const createSkinningDocument = () => {
  const parsed = parseDocument(JSON.stringify(example))
  if (!parsed.ok) {
    throw new Error('Invalid example')
  }
  const part = parsed.document.parts.find((part) => part.id === 'fore')!
  const binding = createSkinBinding(
    parsed.document.scene!.roots,
    'fore',
    ['wrist', 'elbow'],
    part.mesh.vertices,
  )!
  return {document: setPartSkinning(parsed.document, 'fore', binding), part}
}

const createBrushControlsDocument = (): PuppetDocument => {
  const identity = {x: 0, xx: 1, xy: 0, y: 0, yx: 0, yy: 1}
  const weights = [0.75, 0.5, 0.25]
  return {
    format: PUPPET_DOCUMENT_FORMAT,
    motions: [{duration: 1, id: 'idle', tracks: []}],
    parts: [
      {
        id: 'fore',
        mesh: {indices: [0, 1, 2], uvs: [0, 0, 1, 0, 0, 1], vertices: [0, 0, 10, 0, 0, 10]},
        texture: {height: 10, src: 'fore.webp', width: 10},
      },
    ],
    scene: {
      roots: [
        {
          id: 'fore',
          kind: 'part',
          locked: false,
          name: 'Fore',
          skinning: {
            bind: identity,
            influences: [
              {inverseBind: identity, nodeId: 'joint-one', weights},
              {inverseBind: identity, nodeId: 'joint-two', weights: [...weights].reverse()},
            ],
          },
          visible: true,
        },
      ],
    },
    version: PUPPET_DOCUMENT_VERSION,
    viewport: {height: 10, width: 10},
  }
}

test('should let a child rotation influence selected vertices of its parent part and undo the edit', () => {
  const {document, part} = createSkinningDocument()
  const history = useDocumentHistory({initialDocument: document})
  const view = render(() => (
    <SkinningTools
      document={history.document()}
      sourceDocument={history.document()}
      activePartId="fore"
      editMode="parameter"
      parameterValueMap={{'wrist-angle': 60}}
      onDocumentChange={history.setDocument}
      onEditStart={history.beginTransaction}
      onEditEnd={history.endTransaction}
    />
  ))
  fireEvent.click(view.getByRole('checkbox', {name: '스키닝 가중치 편집'}))
  fireEvent.pointerDown(view.getByRole('button', {name: '정점 25 가중치 50%'}), {button: 0})
  const input = view.getByRole('spinbutton', {name: '선택 정점 스키닝 가중치'})
  fireEvent.input(input, {target: {value: '75'}})
  fireEvent.blur(input)
  fireEvent.click(view.getByRole('button', {name: '선택 정점에 적용'}))
  const node = findNode(history.document().scene!.roots, 'fore')
  expect(node?.kind === 'part' ? node.skinning?.influences[0]?.weights[24] : undefined).toBe(0.75)

  const before = new Map([['fore', [...part.mesh.vertices]]])
  const after = new Map([['fore', [...part.mesh.vertices]]])
  applySceneNodeDeformers(composeParameterScene(document, {'wrist-angle': 60}).roots, before)
  applySceneNodeDeformers(
    composeParameterScene(history.document(), {'wrist-angle': 60}).roots,
    after,
  )
  expect(after.get('fore')!.slice(48, 50)).not.toEqual(before.get('fore')!.slice(48, 50))
  expect(after.get('fore')!.slice(0, 48)).toEqual(before.get('fore')!.slice(0, 48))
  expect(view.getByRole('status')).toHaveTextContent('뒤집힘')
  history.undo()
  expect(history.document()).toEqual(document)
  view.unmount()
})

test('should expose the shared brush buttons and retain settings across selection mode', () => {
  const document = createBrushControlsDocument()
  const view = render(() => (
    <SkinningTools document={document} sourceDocument={document} activePartId="fore" />
  ))
  fireEvent.click(view.getByRole('checkbox', {name: '스키닝 가중치 편집'}))
  fireEvent.click(view.getByRole('button', {name: '브러시'}))
  expect(view.getByRole('button', {name: '더하기'})).toHaveAttribute('aria-pressed', 'true')
  fireEvent.click(view.getByRole('button', {name: '빼기'}))
  expect(view.getByRole('button', {name: '빼기'})).toHaveAttribute('aria-pressed', 'true')
  const radius = view.getByRole('spinbutton', {name: '스키닝 브러시 반경'})
  fireEvent.input(radius, {target: {value: '80'}})
  fireEvent.blur(radius)
  fireEvent.click(view.getByRole('button', {name: '정점 선택'}))
  expect(view.queryByRole('spinbutton', {name: '스키닝 브러시 반경'})).not.toBeInTheDocument()
  fireEvent.click(view.getByRole('button', {name: '브러시'}))
  expect(view.getByRole('button', {name: '빼기'})).toHaveAttribute('aria-pressed', 'true')
  expect(view.getByRole('spinbutton', {name: '스키닝 브러시 반경'})).toHaveValue(80)
  fireEvent.click(view.getByRole('button', {name: '부드럽게'}))
  expect(view.getByRole('button', {name: '부드럽게'})).toHaveAttribute('aria-pressed', 'true')
})
