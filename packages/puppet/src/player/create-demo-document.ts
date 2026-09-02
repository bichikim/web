import {
  PUPPET_DOCUMENT_FORMAT,
  PUPPET_DOCUMENT_VERSION,
  type PuppetDocument,
  type PuppetMesh,
  type PuppetParameter,
  type PuppetParameterBinding2D,
} from './document'

const TEXTURE_WIDTH = 640
const TEXTURE_HEIGHT = 480
const CENTER_X = TEXTURE_WIDTH / 2
const CENTER_Y = TEXTURE_HEIGHT / 2
const CENTER_UV = 0.5
const TOP_LEFT_VERTEX_INDEX = 0
const TOP_RIGHT_VERTEX_INDEX = 1
const BOTTOM_RIGHT_VERTEX_INDEX = 2
const BOTTOM_LEFT_VERTEX_INDEX = 3
const CENTER_VERTEX_INDEX = 4
const FULL_ROTATION = Math.PI * 2
const CIRCLE_TEXTURE_SIZE = 144
const DIAMOND_TEXTURE_SIZE = 156
const PREVIEW_DEFORM_OFFSET = 64
const DEMO_PARAMETER_MINIMUM = -30
const DEMO_PARAMETER_MAXIMUM = 30
const DEMO_PARAMETER_VALUES = [DEMO_PARAMETER_MINIMUM, 0, DEMO_PARAMETER_MAXIMUM] as const
const MESH_INDICES = [
  0,
  1,
  CENTER_VERTEX_INDEX,
  1,
  2,
  CENTER_VERTEX_INDEX,
  2,
  BOTTOM_LEFT_VERTEX_INDEX,
  CENTER_VERTEX_INDEX,
  BOTTOM_LEFT_VERTEX_INDEX,
  0,
  CENTER_VERTEX_INDEX,
]

interface RadialMeshOptions {
  readonly centerX: number
  readonly centerY: number
  readonly radius: number
  readonly rotation: number
  readonly sides: number
}

const createSvgSource = (width: number, height: number, content: string) => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${content}</svg>`
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

const createPreviewTexture = () => {
  const svg = `
      <defs>
        <linearGradient id="color" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#7857ff"/>
          <stop offset="0.52" stop-color="#3dd6b4"/>
          <stop offset="1" stop-color="#ffbd59"/>
        </linearGradient>
        <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#07110f"
            stroke-opacity="0.22" stroke-width="2"/>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#color)"/>
      <rect width="100%" height="100%" fill="url(#grid)"/>
      <text x="50%" y="52%" text-anchor="middle" font-family="system-ui" font-size="46"
        font-weight="600" fill="#07110f" fill-opacity="0.78">PUPPET</text>
  `

  return createSvgSource(TEXTURE_WIDTH, TEXTURE_HEIGHT, svg)
}

const createRadialMesh = (options: RadialMeshOptions): PuppetMesh => {
  const vertices: number[] = []
  const uvs: number[] = []
  const indices: number[] = []

  for (let index = 0; index < options.sides; index += 1) {
    const angle = options.rotation + (index / options.sides) * FULL_ROTATION
    const horizontalRatio = Math.cos(angle)
    const verticalRatio = Math.sin(angle)
    vertices.push(
      options.centerX + horizontalRatio * options.radius,
      options.centerY + verticalRatio * options.radius,
    )
    uvs.push((horizontalRatio + 1) / 2, (verticalRatio + 1) / 2)
  }

  const centerIndex = options.sides
  vertices.push(options.centerX, options.centerY)
  uvs.push(CENTER_UV, CENTER_UV)

  for (let index = 0; index < options.sides; index += 1) {
    indices.push(index, (index + 1) % options.sides, centerIndex)
  }

  return {
    boundaryLoops: [Array.from({length: options.sides}, (_, index) => index)],
    indices,
    uvs,
    vertices,
  }
}

const createPreviewVertices = (centerX: number, centerY = CENTER_Y) => [
  0,
  0,
  TEXTURE_WIDTH,
  0,
  TEXTURE_WIDTH,
  TEXTURE_HEIGHT,
  0,
  TEXTURE_HEIGHT,
  centerX,
  centerY,
]

const createDemoParameters = (): ReadonlyArray<PuppetParameter> => [
  {
    defaultValue: 0,
    id: 'angle-x',
    maximum: DEMO_PARAMETER_MAXIMUM,
    minimum: DEMO_PARAMETER_MINIMUM,
    name: 'Angle X',
  },
  {
    defaultValue: 0,
    id: 'angle-y',
    maximum: DEMO_PARAMETER_MAXIMUM,
    minimum: DEMO_PARAMETER_MINIMUM,
    name: 'Angle Y',
  },
]

const createDemoParameterBindings = (): ReadonlyArray<PuppetParameterBinding2D> => [
  {
    id: 'angle-xy',
    keyforms: DEMO_PARAMETER_VALUES.flatMap((y) =>
      DEMO_PARAMETER_VALUES.map((x) => ({
        parts: [
          {
            partId: 'mesh-preview',
            vertices: createPreviewVertices(
              CENTER_X + (x / DEMO_PARAMETER_MAXIMUM) * PREVIEW_DEFORM_OFFSET,
              CENTER_Y + (y / DEMO_PARAMETER_MAXIMUM) * PREVIEW_DEFORM_OFFSET,
            ),
          },
        ],
        values: [x, y] as const,
      })),
    ),
    parameterIds: ['angle-x', 'angle-y'],
    targetPartIds: ['mesh-preview'],
  },
]

export const createDemoDocument = (): PuppetDocument => ({
  format: PUPPET_DOCUMENT_FORMAT,
  motions: [
    {
      duration: 2,
      id: 'idle-deform',
      tracks: [
        {
          axis: 'y',
          keyframes: [
            {time: 0, value: CENTER_Y},
            {time: 1, value: CENTER_Y - PREVIEW_DEFORM_OFFSET},
            {time: 2, value: CENTER_Y},
          ],
          partId: 'mesh-preview',
          vertexIndex: CENTER_VERTEX_INDEX,
        },
      ],
    },
  ],
  parameterBindings: createDemoParameterBindings(),
  parameters: createDemoParameters(),
  parts: [
    {
      id: 'mesh-preview',
      mesh: {
        boundaryLoops: [
          [
            TOP_LEFT_VERTEX_INDEX,
            TOP_RIGHT_VERTEX_INDEX,
            BOTTOM_RIGHT_VERTEX_INDEX,
            BOTTOM_LEFT_VERTEX_INDEX,
          ],
        ],
        indices: MESH_INDICES,
        uvs: [0, 0, 1, 0, 1, 1, 0, 1, CENTER_UV, CENTER_UV],
        vertices: [
          0,
          0,
          TEXTURE_WIDTH,
          0,
          TEXTURE_WIDTH,
          TEXTURE_HEIGHT,
          0,
          TEXTURE_HEIGHT,
          CENTER_X,
          CENTER_Y,
        ],
      },
      texture: {height: TEXTURE_HEIGHT, src: createPreviewTexture(), width: TEXTURE_WIDTH},
    },
    {
      id: 'shape-circle',
      mesh: createRadialMesh({centerX: 150, centerY: 140, radius: 72, rotation: 0, sides: 12}),
      texture: {
        height: CIRCLE_TEXTURE_SIZE,
        src: createSvgSource(
          CIRCLE_TEXTURE_SIZE,
          CIRCLE_TEXTURE_SIZE,
          '<circle cx="72" cy="72" r="68" fill="#ff6f91" stroke="#fff4f7" stroke-width="5"/>',
        ),
        width: CIRCLE_TEXTURE_SIZE,
      },
    },
    {
      id: 'shape-diamond',
      mesh: createRadialMesh({
        centerX: 500,
        centerY: 340,
        radius: 78,
        rotation: -Math.PI / 2,
        sides: 4,
      }),
      texture: {
        height: DIAMOND_TEXTURE_SIZE,
        src: createSvgSource(
          DIAMOND_TEXTURE_SIZE,
          DIAMOND_TEXTURE_SIZE,
          '<polygon points="78,4 152,78 78,152 4,78" fill="#7857ff" stroke="#ece8ff" stroke-width="6"/>',
        ),
        width: DIAMOND_TEXTURE_SIZE,
      },
    },
  ],
  scene: {
    roots: [
      {
        id: 'mesh-preview',
        kind: 'part',
        locked: false,
        name: 'mesh-preview',
        visible: true,
      },
      {
        children: [
          {
            id: 'shape-circle',
            kind: 'part',
            locked: false,
            name: 'shape-circle',
            visible: true,
          },
          {
            id: 'shape-diamond',
            kind: 'part',
            locked: false,
            name: 'shape-diamond',
            visible: true,
          },
        ],
        id: 'shapes',
        kind: 'group',
        locked: false,
        name: 'Shapes',
        visible: true,
      },
    ],
  },
  version: PUPPET_DOCUMENT_VERSION,
  viewport: {height: TEXTURE_HEIGHT, width: TEXTURE_WIDTH},
})
