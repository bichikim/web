import {
  PUPPET_DOCUMENT_FORMAT,
  PUPPET_DOCUMENT_VERSION,
  type PuppetDocument,
} from '../../../../player'
import {createBoneDeformer, editBoneRest} from '../../bone-editing'

const MESH_SIZE = 100

const BASE_DOCUMENT = {
  format: PUPPET_DOCUMENT_FORMAT,
  motions: [],
  parts: [
    {
      id: 'mesh-preview',
      mesh: {
        boundaryLoops: [[0, 1, 2]],
        indices: [0, 1, 2],
        uvs: [0, 0, 1, 0, 1, 1],
        vertices: [0, 0, MESH_SIZE, 0, MESH_SIZE, MESH_SIZE],
      },
      texture: {height: MESH_SIZE, src: 'data:,', width: MESH_SIZE},
    },
  ],
  scene: {
    roots: [{id: 'mesh-preview', kind: 'part', locked: false, name: 'mesh-preview', visible: true}],
  },
  version: PUPPET_DOCUMENT_VERSION,
  viewport: {height: MESH_SIZE, width: MESH_SIZE},
} satisfies PuppetDocument

export const BASE_BONE_DOCUMENT = createBoneDeformer(BASE_DOCUMENT, ['mesh-preview'])!
export const EDITABLE_BONE_DOCUMENT = editBoneRest({
  document: BASE_BONE_DOCUMENT,
  nodeId: 'bone',
  operation: 'append',
  point: {x: 900, y: 240},
})!
