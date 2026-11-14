import {
  type BatcherAdaptor,
  DefaultShader,
  type Geometry,
  type Shader,
  type WebGLRenderer,
} from 'pixi.js'
import {createGradientGeometry, type GradientGeometry} from './create-gradient-geometry'
import {createGradientShader} from './create-gradient-shader'

interface GradientBatchPipe {
  readonly _adaptor: BatcherAdaptor
}

interface ProvokingExtension {
  readonly FIRST_VERTEX_CONVENTION_WEBGL: number
  provokingVertexWEBGL(mode: number): void
}

const configured = new WeakSet<WebGLRenderer>()

/** Adapts PixiJS 8.22's WebGL batch boundary; expanded buffers belong to this renderer. */
export const configureBatchGradients = (renderer: WebGLRenderer): void => {
  if (configured.has(renderer) || renderer.context.webGLVersion !== 2) {
    return
  }
  configured.add(renderer)
  // Pixi exposes the adaptor type, but BatcherPipe keeps this instance private.
  const pipe = renderer.renderPipes.batch as unknown as GradientBatchPipe
  const adaptor = pipe._adaptor
  const {start} = adaptor
  const provoking = renderer.gl.getExtension('WEBGL_provoking_vertex') as ProvokingExtension | null
  const geometries = new Map<Geometry, GradientGeometry>()
  const shaders = new Map<DefaultShader, Shader>()
  const releases = new Map<Geometry, VoidFunction>()
  adaptor.start = (batch, geometry, shader) => {
    if (!(shader instanceof DefaultShader)) {
      return start.call(adaptor, batch, geometry, shader)
    }
    let expanded = geometries.get(geometry)
    if (expanded === undefined) {
      expanded = createGradientGeometry(geometry, provoking === null ? 'last' : 'first')
      geometries.set(geometry, expanded)
      const release = () => {
        geometries.get(geometry)?.destroy()
        geometries.delete(geometry)
        geometry.off('destroy', release)
        releases.delete(geometry)
      }
      releases.set(geometry, release)
      geometry.on('destroy', release)
    }
    let material = shaders.get(shader)
    if (material === undefined) {
      material = createGradientShader(shader)
      shaders.set(shader, material)
    }
    expanded.update()
    // Pixi selects FIRST during initialization; restore it after external shared drawing.
    provoking?.provokingVertexWEBGL(provoking.FIRST_VERTEX_CONVENTION_WEBGL)
    return start.call(adaptor, batch, expanded.geometry, material)
  }
  renderer.runners.destroy.add({
    destroy() {
      adaptor.start = start
      for (const release of releases.values()) {
        release()
      }
      for (const shader of shaders.values()) {
        shader.destroy(true)
      }
      shaders.clear()
    },
  })
}
