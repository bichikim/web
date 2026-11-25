import {
  PUPPET_DOCUMENT_FORMAT,
  type PuppetDocument,
  type PuppetSceneDeformerNode,
} from '@winter-love/puppet/player'
/** A small authored rig makes each draggable segment and its fixed link length measurable. */
export const jointChainDocument = (): PuppetDocument => {
  const count = 4
  const length = 80
  const halfWidth = 10
  const maximum = 90
  const halfTurn = 180
  const rootPosition = {x: 100, y: 200}
  const bottomLeft = 3
  const colors = ['#2563eb', '#16a34a', '#d97706', '#9333ea']
  const nodes: PuppetSceneDeformerNode[] = Array.from({length: count}, (_, index) => {
    const x = index === 0 ? rootPosition.x : length
    const y = index === 0 ? rootPosition.y : 0
    return {
      boneRestPoints: [0, 0, length, 0],
      bounds: {height: halfWidth * 2, width: length, x: 0, y: -halfWidth},
      children: [
        {
          id: `segment-${index}`,
          kind: 'part',
          locked: false,
          name: `Segment ${index}`,
          visible: true,
        },
      ],
      columns: 1,
      controlPoints: [x, y, x + length, y],
      coordinateSpace: 'parent',
      deformerType: 'rotation',
      id: `rotation-${index}`,
      kind: 'deformer',
      locked: false,
      name: `Joint ${index}`,
      rotationAngle: 0,
      rows: 1,
      visible: true,
    }
  })
  const root = nodes.reduceRight<PuppetSceneDeformerNode | undefined>(
    (child, node) => (child === undefined ? node : {...node, children: [...node.children, child]}),
    undefined,
  )!
  return {
    format: PUPPET_DOCUMENT_FORMAT,
    motions: [],
    parameterBindings: nodes.map((node, index) => ({
      id: `binding-${index}`,
      interpolation: 'grid',
      keyforms: [-maximum, 0, maximum].map((value) => {
        const angle = (value * Math.PI) / halfTurn
        const [x, y] = node.controlPoints
        return {
          deformers: [
            {
              controlPoints: [x!, y!, x! + Math.cos(angle) * length, y! + Math.sin(angle) * length],
              kind: 'deformer',
              nodeId: node.id,
              rotationAngle: angle,
            },
          ],
          parts: [],
          values: [value],
        }
      }),
      parameterIds: [`joint-${index}`],
      targetDeformerIds: [node.id],
    })),
    parameters: nodes.map((_, index) => ({
      defaultValue: 0,
      id: `joint-${index}`,
      maximum,
      minimum: -maximum,
      name: `Joint ${index}`,
    })),
    parts: nodes.map((_, index) => ({
      id: `segment-${index}`,
      mesh: {
        indices: [0, 1, 2, 0, 2, bottomLeft],
        uvs: [0, 0, 1, 0, 1, 1, 0, 1],
        vertices: [0, -halfWidth, length, -halfWidth, length, halfWidth, 0, halfWidth],
      },
      texture: {
        height: halfWidth * 2,
        src: `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="80" height="20"><rect width="80" height="20" fill="${colors[index]}"/></svg>`)}`,
        width: length,
      },
    })),
    scene: {roots: [root]},
    version: 1,
    viewport: {height: 400, width: 600},
  }
}
