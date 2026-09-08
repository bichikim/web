import {createDemoDocument, getDocumentScene, type PuppetSceneDeformerNode} from '../../../player'
import {createSkinBinding} from '../../skinning'
const JOINT_LENGTH = 50
export const createSkinDocument = () => {
  const document = createDemoDocument()
  const rotation = (id: string, x: number): PuppetSceneDeformerNode => ({
    id,
    kind: 'deformer',
    deformerType: 'rotation',
    name: id,
    locked: false,
    bounds: {x: 0, width: 100, y: 0, height: 100},
    visible: true,
    boneRestPoints: [x, 0, x + JOINT_LENGTH, 0],
    columns: 1,
    children: [],
    rows: 1,
    controlPoints: [x, 0, x + JOINT_LENGTH, 0],
  })
  const roots = [
    ...getDocumentScene(document).roots,
    rotation('Shoulder', 0),
    rotation('Elbow', JOINT_LENGTH),
  ]
  const part = document.parts[0]!
  const skinning = createSkinBinding(roots, part.id, ['Shoulder', 'Elbow'], part.mesh.vertices)!
  return {
    ...document,
    scene: {roots: roots.map((node) => (node.id === part.id ? {...node, skinning} : node))},
  }
}
