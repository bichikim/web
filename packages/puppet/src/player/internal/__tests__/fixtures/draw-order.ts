/* eslint-disable no-magic-numbers -- Exact numeric fixtures reproduce interpolation drift and fractional occlusion. */
import {createEmptyDocument} from '../../../create-empty-document'
import type {
  PuppetDocument,
  PuppetPartRenderProperties,
  PuppetScenePartNode,
} from '../../../document'

export const constantOrderChannels = ['missing', 'opacity', 'rest'] as const
export type OrderChannel = (typeof constantOrderChannels)[number] | 'changing'

export const orderInputs = [
  {x: 0, y: 0},
  {x: 0.02, y: 0.17},
  {x: 0.3333333333333, y: 0.123456789},
  {x: 0.671, y: 0.019},
  {x: 0.02, y: 0.17},
  {x: 0, y: 0},
] as const

const node = (id: string): PuppetScenePartNode => ({
  id,
  kind: 'part',
  locked: false,
  name: id,
  visible: true,
})

/** Coincident opaque quads make every ordering change observable in rendered pixels. */
export const createOrderDocument = (
  channel: OrderChannel,
  target: 'part' | 'group' = 'part',
  rest = 500,
): PuppetDocument => {
  const mesh = {
    indices: [0, 1, 2, 0, 2, 3],
    uvs: [0, 0, 1, 0, 1, 1, 0, 1],
    vertices: [10, 10, 90, 10, 90, 90, 10, 90],
  }
  const propertiesAt = (index: number): PuppetPartRenderProperties | undefined => {
    switch (channel) {
      case 'missing':
        return undefined
      case 'opacity':
        return {opacity: 1}
      case 'rest':
        return {drawOrder: rest}
      case 'changing':
        return {drawOrder: [499.75, 500.75, 499.75][index]!}
    }
  }
  return {
    ...createEmptyDocument(),
    parameterBindings: [
      {
        id: 'order',
        influences: [
          {
            parameterId: 'weight',
            points: [
              {value: 0, weight: 0},
              {value: 1, weight: 1},
            ],
          },
        ],
        keyforms: (
          [
            [0, 0],
            [1, 0],
            [0, 1],
          ] as const
        ).map((values, index) => {
          const properties = propertiesAt(index)
          return {
            groups:
              target === 'group' ? [{groupId: 'group', properties: properties ?? {}}] : undefined,
            parts:
              target === 'part' ? [{partId: 'keyed', properties, vertices: mesh.vertices}] : [],
            values,
          }
        }),
        parameterIds: ['x', 'y'],
        targetGroupIds: target === 'group' ? ['group'] : undefined,
        targetPartIds: target === 'part' ? ['keyed'] : [],
      },
    ],
    parameters: ['x', 'y', 'weight'].map((id) => ({
      defaultValue: id === 'weight' ? 1 : 0,
      id,
      maximum: 1,
      minimum: 0,
      name: id,
    })),
    parts: ['plain', 'keyed'].map((id) => ({
      id,
      mesh,
      properties: {drawOrder: id === 'plain' && channel === 'changing' ? 500.25 : rest},
      texture: {
        height: 1,
        src: `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"><path fill="${id === 'keyed' ? 'red' : 'blue'}" d="M0 0H1V1H0z"/></svg>`)}`,
        width: 1,
      },
    })),
    scene: {
      roots: [
        node('plain'),
        target === 'part'
          ? node('keyed')
          : {
              children: [node('keyed')],
              id: 'group',
              kind: 'group',
              locked: false,
              name: 'Group',
              properties: {drawOrder: rest},
              visible: true,
            },
      ],
    },
    viewport: {height: 100, width: 100},
  }
}
