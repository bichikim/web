import {createDemoDocument, getDocumentScene, type PuppetSceneDeformerNode} from '../../../player'
import {createSkinBinding} from '../../skinning'
const JOINT_LENGTH = 50
export const createSkinDocument = () => {
  const document = createDemoDocument()
  const rotation = (id: string, x: number): PuppetSceneDeformerNode => ({
    deformerType: 'rotation',
    id,
    kind: 'deformer',
    locked: false,
    bounds: {width: 100, x: 0, height: 100, y: 0},
    name: id,
    boneRestPoints: [x, 0, x + JOINT_LENGTH, 0],
    children: [],
    visible: true,
    columns: 1,
    controlPoints: [x, 0, x + JOINT_LENGTH, 0],
    rows: 1,
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
