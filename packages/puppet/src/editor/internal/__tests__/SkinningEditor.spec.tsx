import {createSkinSession, SkinSessionContext} from '../skin-session'
/** @vitest-environment jsdom */
import {createSignal} from 'solid-js'
import smoothExample from '../../../../examples/three-parts-skinning.json'
import {fireEvent, render} from '@solidjs/testing-library'
import {expect, test} from 'vitest'
import {createSkinDocument} from '../../../deformation/__tests__/fixtures/skin'
import {useDocumentHistory} from '../../use-document-history'
import {SkinningEditor} from '../SkinningEditor'
import {setPartSkinning} from '../skinning'
import example from '../../../../examples/rotation-skinning.json'
import {parseDocument, type PuppetDocument} from '../../../player'
import {composeParameterScene} from '../../../deformation/scene'
import {applySceneNodeDeformers} from '../../../deformation/vertices'
import {findNode} from '../scene-tree'

test('should connect two rotations, edit one vertex, and undo the changes', () => {
  const initial = createSkinDocument()
  const [mesh, group, shoulder, elbow] = initial.scene.roots
  if (
    shoulder?.kind !== 'deformer' ||
    elbow?.kind !== 'deformer' ||
    mesh === undefined ||
    group === undefined
  ) {
    throw new Error('Invalid fixture')
  }
  const document = {
    ...initial,
    scene: {roots: [group, {...shoulder, children: [{...elbow, children: [mesh]}]}]},
  }
  const partId = document.parts[0]!.id
  const history = useDocumentHistory({initialDocument: setPartSkinning(document, partId)})
  const view = render(() => (
    <SkinningEditor
      document={history.document()}
      partId={partId}
      vertexIndex={0}
      onDocumentChange={history.setDocument}
    />
  ))
  const connect = view.getByRole('button', {name: '스키닝 적용'})
  expect(view.queryByRole('checkbox')).not.toBeInTheDocument()
  expect(connect).not.toBeDisabled()
  fireEvent.click(connect)
  const input = view.getByRole('spinbutton', {name: 'Shoulder 스키닝 가중치'})
  fireEvent.input(input, {target: {value: '80'}})
  fireEvent.blur(input)
  const node = findNode(history.document().scene!.roots, partId)
  expect(node?.kind === 'part' ? node.skinning?.influences[0]?.weights[0] : null).toBeCloseTo(0.8)
  expect(node?.kind === 'part' ? node.skinning?.influences[1]?.weights[0] : null).toBeCloseTo(0.2)
  fireEvent.click(view.getByRole('button', {name: '자동 가중치 다시 계산'}))
  expect(view.getByRole('spinbutton', {name: 'Shoulder 스키닝 가중치'})).not.toHaveValue(80)
  fireEvent.click(view.getByRole('button', {name: '스키닝 해제'}))
  history.undo()
  expect(view.getByRole('button', {name: '스키닝 해제'})).toBeInTheDocument()
})

test('should keep wrist attachment and mixed deformation after editing the whole-part input', () => {
  const parsed = parseDocument(JSON.stringify(example))
  if (!parsed.ok) {
    throw new Error('Invalid example')
  }
  const history = useDocumentHistory({initialDocument: parsed.document})
  const fore = parsed.document.parts.find((part) => part.id === 'fore')!
  const view = render(() => (
    <SkinningEditor
      document={history.document()}
      partId="fore"
      onDocumentChange={history.setDocument}
    />
  ))
  expect(view.getByText('전체 영향 강도')).toBeInTheDocument()
  const input = view.getByRole('spinbutton', {name: '① 어깨 스키닝 영향 강도'})
  const deform = (document: PuppetDocument, angle: number) => {
    const points = new Map([['fore', [...fore.mesh.vertices]]])
    applySceneNodeDeformers(composeParameterScene(document, {'elbow-angle': angle}).roots, points)
    return points.get('fore')!
  }
  for (const value of [0, 10, 30, 80, 99, 100, 20]) {
    fireEvent.input(input, {target: {value: String(value)}})
    fireEvent.blur(input)
    expect(input).toHaveValue(value)
    const node = findNode(history.document().scene!.roots, 'fore')
    if (node?.kind !== 'part') {
      throw new Error('Missing forearm')
    }
    const weights = node.skinning!.influences[0]!.weights
    expect(new Set(weights).size).toBeGreaterThan(3)
    for (const angle of [-90, -60, -30, 0, 30, 60, 90]) {
      const actual = deform(history.document(), angle)
      const original = deform(parsed.document, angle)
      for (let index = 0; index < fore.mesh.indices.length; index += 3) {
        const [a, b, c] = fore.mesh.indices.slice(index, index + 3).map((vertex) => vertex * 2)
        const area =
          (actual[b!]! - actual[a!]!) * (actual[c! + 1]! - actual[a! + 1]!) -
          (actual[c!]! - actual[a!]!) * (actual[b! + 1]! - actual[a! + 1]!)
        expect(area, `weight ${value}, angle ${angle}, triangle ${index / 3}`).toBeGreaterThan(0)
      }
      expect(actual).not.toEqual(original)
      actual
        .slice(-4)
        .forEach((point, index) => expect(point).toBeCloseTo(original.slice(-4)[index]!))
    }
  }
})

test('should apply the parent, owner and child in one click without unrelated rotations', () => {
  const parsed = parseDocument(JSON.stringify(example))
  if (!parsed.ok) {
    throw new Error('Invalid example')
  }
  const root = parsed.document.scene!.roots[0]!
  if (root.kind !== 'deformer') {
    throw new Error('Missing rotation')
  }
  const document = {
    ...parsed.document,
    scene: {roots: [...parsed.document.scene!.roots, {...root, children: [], id: 'unrelated'}]},
  }
  const history = useDocumentHistory({initialDocument: setPartSkinning(document, 'fore')})
  const view = render(() => (
    <SkinningEditor
      document={history.document()}
      partId="fore"
      onDocumentChange={history.setDocument}
    />
  ))
  expect(view.queryByRole('checkbox')).not.toBeInTheDocument()
  fireEvent.click(view.getByRole('button', {name: '스키닝 적용'}))
  const node = findNode(history.document().scene!.roots, 'fore')
  if (node?.kind !== 'part') {
    throw new Error('Missing part')
  }
  expect(node.skinning?.influences.map((influence) => influence.nodeId)).toEqual([
    'shoulder',
    'elbow',
    'wrist',
  ])
  expect(node.skinning?.influences[2]?.weights[24]).toBe(0.5)
  history.undo()
  expect(view.getByRole('button', {name: '스키닝 적용'})).toBeInTheDocument()
})

test('should require a rotation hierarchy for an unattached part', () => {
  const document = createSkinDocument()
  const partId = document.parts[0]!.id
  const view = render(() => (
    <SkinningEditor
      document={setPartSkinning(document, partId)}
      partId={partId}
      onDocumentChange={() => {}}
    />
  ))
  expect(view.getByRole('button', {name: '스키닝 적용'})).toBeDisabled()
  expect(view.queryByText('파츠를 연결된 회전 디포머 아래에 배치하세요.')).not.toBeInTheDocument()
})

test('should recalculate smooth weights from the panel, persist settings and synchronize edits', () => {
  const parsed = parseDocument(JSON.stringify(smoothExample))
  if (!parsed.ok) {
    throw new Error('Invalid example')
  }
  const [document, setDocument] = createSignal(parsed.document)
  const view = render(() => (
    <SkinningEditor document={document()} partId="a" onDocumentChange={setDocument} />
  ))
  fireEvent.click(view.getByRole('button', {name: '부드러운형'}))
  const range = view.getByRole('spinbutton', {name: '스키닝 영향 범위'})
  fireEvent.input(range, {target: {value: '1.5'}})
  fireEvent.blur(range)
  fireEvent.click(view.getByRole('checkbox', {name: '스키닝 경계 함께 편집'}))
  const node = findNode(document().scene!.roots, 'a')!
  if (node.kind !== 'part') {
    throw new Error('Missing part')
  }
  expect(node.skinning?.mode).toBe('smooth')
  expect(node.skinning?.range).toBe(1.5)
  expect(node.skinning?.syncSeams).toBe(true)
  const restored = parseDocument(JSON.stringify(document()))
  expect(restored.ok).toBe(true)
  if (restored.ok) {
    expect(findNode(restored.document.scene!.roots, 'a')).toEqual(node)
  }
  fireEvent.click(view.getByRole('button', {name: '자동 가중치 다시 계산'}))
  expect(view.getByRole('spinbutton', {name: '스키닝 영향 범위'})).toHaveValue(1.5)
})

test('should edit the joint selected in the shared session without a dropdown', () => {
  const initial = createSkinDocument()
  const session = createSkinSession()
  const view = render(() => (
    <SkinSessionContext.Provider value={session}>
      <SkinningEditor
        document={initial}
        partId={initial.parts[0]!.id}
        onDocumentChange={() => {}}
      />
    </SkinSessionContext.Provider>
  ))
  session.start(initial.parts[0]!.id)
  session.pick(initial, 'Elbow')
  expect(view.getAllByRole('spinbutton', {name: /스키닝 영향 강도/})).toHaveLength(1)
  expect(view.getByRole('spinbutton', {name: 'Elbow 스키닝 영향 강도'})).toBeTruthy()
  expect(view.queryByRole('button', {name: /스키닝 편집 관절/})).toBeNull()
})
