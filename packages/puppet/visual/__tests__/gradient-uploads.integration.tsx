import {expect, test, vi} from 'vitest'
import {createEmptyDocument, createPlayer, parseDocumentValue, type Player} from '../../src/player'

const fixture = () => {
  const vertices = [0, 0, 16, 0, 16, 16, 0, 16]
  const parsed = parseDocumentValue({
    ...createEmptyDocument(),
    parameterBindings: [
      {
        id: 'bend',
        interpolation: 'grid',
        keyforms: [0, 1].map((value) => ({
          parts: [{partId: 'part', vertices: vertices.map((rest, index) => rest + value * index)}],
          values: [value],
        })),
        parameterIds: ['bend'],
        targetPartIds: ['part'],
      },
    ],
    parameters: [{defaultValue: 0, id: 'bend', maximum: 1, minimum: 0, name: 'Bend'}],
    parts: [
      {
        id: 'part',
        mesh: {indices: [0, 1, 2, 0, 2, 3], uvs: [0, 0, 1, 0, 1, 1, 0, 1], vertices},
        texture: {
          height: 1,
          src: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="1" height="1"%3E%3Crect width="1" height="1" fill="white"/%3E%3C/svg%3E',
          width: 1,
        },
      },
    ],
    scene: {roots: [{id: 'part', kind: 'part', locked: false, name: 'Part', visible: true}]},
    viewport: {height: 32, width: 32},
  })
  if (!parsed.ok) {
    throw new Error('Invalid gradient upload fixture')
  }
  return parsed.document
}

test('should submit only active provoking gradients to the real WebGL buffer', async () => {
  const tracked = new Set<WebGLBuffer>()
  const uploads: Array<{bytes: number; offset: number}> = []
  const pointer = WebGL2RenderingContext.prototype.vertexAttribPointer
  const upload = WebGL2RenderingContext.prototype.bufferSubData
  vi.spyOn(WebGL2RenderingContext.prototype, 'vertexAttribPointer').mockImplementation(
    function attribute(this: WebGL2RenderingContext, ...args) {
      const program = this.getParameter(this.CURRENT_PROGRAM) as WebGLProgram | null
      if (program !== null && args[0] === this.getAttribLocation(program, 'aUvGradient')) {
        const buffer = this.getParameter(this.ARRAY_BUFFER_BINDING) as WebGLBuffer | null
        if (buffer !== null) {
          tracked.add(buffer)
        }
      }
      pointer.call(this, ...args)
    },
  )
  vi.spyOn(WebGL2RenderingContext.prototype, 'bufferSubData').mockImplementation(function buffer(
    this: WebGL2RenderingContext,
    ...args
  ) {
    const bound = this.getParameter(this.ARRAY_BUFFER_BINDING) as WebGLBuffer | null
    const source = args[2]
    if (
      args[0] === this.ARRAY_BUFFER &&
      bound !== null &&
      tracked.has(bound) &&
      source instanceof Float32Array
    ) {
      uploads.push({
        bytes: (args[4] ?? source.length) * Float32Array.BYTES_PER_ELEMENT,
        offset: args[1],
      })
    }
    upload.call(this, ...args)
  })
  let player: Player | undefined
  try {
    player = await createPlayer({
      canvas: document.createElement('canvas'),
      document: fixture(),
      renderer: 'webgl',
      resolution: 1,
    })
    player.stop()
    player.redraw()
    expect(tracked.size).toBeGreaterThan(0)
    uploads.length = 0
    player.setParameterValue('bend', 1)
    player.redraw()
    expect(uploads.length).toBeGreaterThan(0)
    expect(uploads.every(({offset, bytes}) => offset === 64 && bytes === 32)).toBe(true)
  } finally {
    player?.destroy()
    vi.restoreAllMocks()
  }
})
