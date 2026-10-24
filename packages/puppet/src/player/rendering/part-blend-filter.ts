import {
  blendTemplateFrag,
  blendTemplateVert,
  blendTemplateWgsl,
  Filter,
  GlProgram,
  GpuProgram,
  Texture,
  UniformGroup,
} from 'pixi.js'

import {
  PUPPET_ALPHA_BLEND_MODES,
  PUPPET_PART_BLEND_MODES,
  type PuppetAlphaBlendMode,
  type PuppetDocument,
  type PuppetPartBlendMode,
} from '../document'
import {getSceneLayerStructure} from '../internal/scene-layers'
import {PART_BLEND_GLSL, PART_BLEND_WGSL} from './part-blend-shader'

const FIXED_FUNCTION_BLEND_MODES: ReadonlySet<PuppetPartBlendMode> = new Set([
  'add',
  'multiply',
  'normal',
  'screen',
])

/** Whether the part is drawn by sampling the pixels behind it instead of fixed-function blending. */
export const usesBackdropBlend = (
  blendMode: PuppetPartBlendMode,
  alphaBlendMode: PuppetAlphaBlendMode,
) => alphaBlendMode !== 'over' || !FIXED_FUNCTION_BLEND_MODES.has(blendMode)

/**
 * Whether any part or offscreen group of the document needs backdrop blending (and so a WebGL
 * back buffer).
 */
export const documentUsesBackdropBlend = (document: PuppetDocument) =>
  [
    ...document.parts.map((part) => part.properties),
    ...getSceneLayerStructure(document).layers.map(({group}) => group.properties),
  ].some((properties) =>
    usesBackdropBlend(properties?.blendMode ?? 'normal', properties?.alphaBlendMode ?? 'over'),
  )

const glFragment = () =>
  blendTemplateFrag
    .replace('uniform float uBlend;', '')
    .replace('{FUNCTIONS}', PART_BLEND_GLSL)
    .replace('{MAIN}', 'finalColor = compositePart(front, back);')

const gpuSource = () =>
  blendTemplateWgsl
    .replace(/struct BlendUniforms \{[^}]*\};/u, '')
    .replace(/@group\(1\) @binding\(0\) var<uniform> blendUniforms : BlendUniforms;/u, '')
    .replace('{FUNCTIONS}', PART_BLEND_WGSL)
    .replace(
      '{MAIN}',
      'out = compositePart(front, back, i32(blendUniforms.uBlendMode + 0.5), i32(blendUniforms.uAlphaMode + 0.5));',
    )

/** A filter that blends its input over the backdrop and replaces the target pixels with the result. */
export interface PartBlendFilter {
  readonly filter: Filter
  setModes(blendMode: PuppetPartBlendMode, alphaBlendMode: PuppetAlphaBlendMode): void
}

// Built on demand: importing the module must not touch PixiJS shader exports.
export const createPartBlendFilter = (): PartBlendFilter => {
  const uniforms = new UniformGroup({
    uAlphaMode: {type: 'f32', value: 0},
    uBlendMode: {type: 'f32', value: 0},
  })
  const source = gpuSource()
  const filter = new Filter({
    antialias: 'inherit',
    blendRequired: true,
    glProgram: GlProgram.from({fragment: glFragment(), vertex: blendTemplateVert}),
    gpuProgram: GpuProgram.from({
      fragment: {entryPoint: 'mainFragment', source},
      vertex: {entryPoint: 'mainVertex', source},
    }),
    // Front and backdrop must share the same texture coordinates at every display resolution.
    resolution: 'inherit',
    resources: {blendUniforms: uniforms, uBackTexture: Texture.EMPTY},
  })
  // The shader already composites over the backdrop, so the result replaces the target.
  filter.blendMode = 'none'
  return {
    filter,
    setModes(blendMode, alphaBlendMode) {
      uniforms.uniforms.uBlendMode = PUPPET_PART_BLEND_MODES.indexOf(blendMode)
      uniforms.uniforms.uAlphaMode = PUPPET_ALPHA_BLEND_MODES.indexOf(alphaBlendMode)
    },
  }
}
