import {createDemoDocument, getDocumentScene, type PuppetSceneDeformerNode} from '../../../player'
import {createSkinBinding} from '../../skinning'
const JOINT_LENGTH = 50
export const createSkinDocument = () => {
  const document = createDemoDocument()
  const rotation = (id: string, x: number): PuppetSceneDeformerNode => ({
    boneRestPoints: [x, 0, x + JOINT_LENGTH, 0],
    bounds: {height: 100, width: 100, x: 0, y: 0},
    children: [],
    columns: 1,
    controlPoints: [x, 0, x + JOINT_LENGTH, 0],
    deformerType: 'rotation',
    id,
    kind: 'deformer',
    locked: false,
    name: id,
    rows: 1,
    visible: true,
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
