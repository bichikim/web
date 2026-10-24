/** @vitest-environment jsdom */
import {createSignal} from 'solid-js'
import {fireEvent, render} from '@solidjs/testing-library'
import {expect, test} from 'vitest'
import {createSkinDocument} from '../../../deformation/__tests__/fixtures/skin'
import {getDocumentScene, type PuppetDocument} from '../../../player'
import {setPartSkinning} from '../skinning'
import {findNode} from '../scene-tree'
import {SkinningConnections} from '../SkinningConnections'

test('should bind selected parts to selected independent joints through the panel', () => {
  const initial = createSkinDocument()
  const partId = initial.parts[0]!.id
  const [document, setDocument] = createSignal<PuppetDocument>(setPartSkinning(initial, partId))
  const view = render(() => (
    <SkinningConnections
      document={document()}
      nodeIds={[partId, 'Shoulder', 'Elbow']}
      onDocumentChange={setDocument}
    />
  ))
  fireEvent.click(view.getByRole('button', {name: '선택 관절로 연결'}))
  const node = findNode(getDocumentScene(document()).roots, partId)
  expect(node?.kind === 'part' && node.skinning?.influences.map((item) => item.nodeId)).toEqual([
    'Shoulder',
    'Elbow',
  ])
})
