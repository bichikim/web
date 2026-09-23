/** @vitest-environment jsdom */
import {fireEvent, render} from '@solidjs/testing-library'
import {expect, test} from 'vitest'
import example from '../../../../examples/rotation-skinning.json'
import {parseDocument} from '../../../player'
import {createSkinBinding} from '../../../deformation/skinning'
import {composeParameterScene} from '../../../deformation/scene'
import {applySceneNodeDeformers} from '../../../deformation/vertices'
import {useDocumentHistory} from '../../use-document-history'
import {setPartSkinning} from '../skinning'
import {findNode} from '../scene-tree'
import {SkinningTools} from '../SkinningTools'

test('should let a child rotation influence selected vertices of its parent part and undo the edit', () => {
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
  const document = setPartSkinning(parsed.document, 'fore', binding)
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
})

test('should expose the shared brush buttons and retain settings across selection mode', () => {
  const parsed = parseDocument(JSON.stringify(example))
  if (!parsed.ok) {
    throw new Error('Invalid example')
  }
  const view = render(() => (
    <SkinningTools
      document={parsed.document}
      sourceDocument={parsed.document}
      activePartId="fore"
    />
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
