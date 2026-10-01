import {FILTER_SCENE_VERTEX} from './filter-vertex'
import {Filter, GlProgram, type Texture, UniformGroup} from 'pixi.js'

export interface MaskedPixelPushFilterOptions {
  readonly distanceX: number
  readonly distanceY: number
  readonly maskTexture: Texture
}

const MASKED_PIXEL_PUSH_FRAGMENT = `
in vec2 vSceneCoord;
in vec2 vTextureCoord;
out vec4 finalColor;

uniform sampler2D uTexture;
uniform sampler2D uMaskTexture;
uniform vec4 uInputClamp;
uniform highp vec4 uInputSize;
uniform vec2 uDistancePixels;
uniform float uProgress;

void main(void) {
  float maskWeight = texture(uMaskTexture, vSceneCoord).r;
  vec2 sampleOffset = uDistancePixels * uProgress * maskWeight * uInputSize.zw;
  vec2 sampleCoordinate = clamp(vTextureCoord - sampleOffset, uInputClamp.xy, uInputClamp.zw);
  finalColor = texture(uTexture, sampleCoordinate);
}
`

interface PixelPushUniforms {
  uProgress: number
}

export class MaskedPixelPushFilter extends Filter {
  readonly #uniforms: PixelPushUniforms

  constructor(options: MaskedPixelPushFilterOptions) {
    const uniformGroup = new UniformGroup({
      uDistancePixels: {
        type: 'vec2<f32>',
        value: new Float32Array([options.distanceX, options.distanceY]),
      },
      uProgress: {type: 'f32', value: 0},
    })

    super({
      antialias: 'off',
      glProgram: GlProgram.from({
        fragment: MASKED_PIXEL_PUSH_FRAGMENT,
        name: 'focus-room-masked-pixel-push',
        vertex: FILTER_SCENE_VERTEX,
      }),
      resources: {
        maskedPixelPushUniforms: uniformGroup,
        uMaskSampler: options.maskTexture.source.style,
        uMaskTexture: options.maskTexture.source,
      },
    })

    this.#uniforms = uniformGroup.uniforms as PixelPushUniforms
  }

  setProgress(progress: number) {
    this.#uniforms.uProgress = progress
  }
}
