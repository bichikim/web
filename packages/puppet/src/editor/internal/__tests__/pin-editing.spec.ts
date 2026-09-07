import {expect, test} from 'vitest'
import {createDemoDocument} from '../../../player'
import {convertSceneContainers} from '../container-conversion'
import {editPinLayout} from '../pin-editing'
import {addParameter} from '../parameter-keyforms'
import {setSceneNodeState} from '../scene-graph'

const createDocument = () =>
  convertSceneContainers({document: createDemoDocument(), nodeIds: ['shapes'], targetKind: 'pin'})!

test('should reject invalid settings and preserve the last pin', () => {
  const document = createDocument()
  const options = {document, index: 0, nodeId: 'shapes', preserve: true}
  expect(editPinLayout({...options, operation: 'remove'})).toBeUndefined()
  expect(editPinLayout({...options, operation: 'settings', radius: 0})).toBeUndefined()
  expect(editPinLayout({...options, operation: 'settings', strength: 2})).toBeUndefined()
  expect(editPinLayout({...options, operation: 'append', point: {x: NaN, y: 1}})).toBeUndefined()
})

test('should reject layout edits after locking or connecting a parameter', () => {
  const source = createDocument()
  for (const document of [
    setSceneNodeState({document: source, locked: true, nodeId: 'shapes'})!,
    addParameter({document: source, nodeIds: ['shapes']})!.document,
  ]) {
    expect(
      editPinLayout({
        document,
        index: 0,
        nodeId: 'shapes',
        operation: 'append',
        point: {x: 50, y: 20},
        preserve: true,
      }),
    ).toBeUndefined()
  }
})
