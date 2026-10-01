import {FILTER_SCENE_VERTEX} from './filter-vertex'
import {Filter, GlProgram, type Texture} from 'pixi.js'

export interface LayerMaskFilterOptions {
  readonly maskTexture: Texture
}

const LAYER_MASK_FRAGMENT = `
in vec2 vSceneCoord;
in vec2 vTextureCoord;
out vec4 finalColor;

uniform sampler2D uTexture;
uniform sampler2D uMaskTexture;

void main(void) {
  float maskWeight = texture(uMaskTexture, vSceneCoord).r;
  finalColor = texture(uTexture, vTextureCoord) * maskWeight;
}
`

/** Applies a red-channel texture mask without Pixi's pooled alpha-mask effect. */
export class LayerMaskFilter extends Filter {
  constructor(options: LayerMaskFilterOptions) {
    super({
      antialias: 'off',
      glProgram: GlProgram.from({
        fragment: LAYER_MASK_FRAGMENT,
        name: 'focus-room-layer-mask',
        vertex: FILTER_SCENE_VERTEX,
      }),
      resources: {
        uMaskSampler: options.maskTexture.source.style,
        uMaskTexture: options.maskTexture.source,
      },
    })
  }
}
