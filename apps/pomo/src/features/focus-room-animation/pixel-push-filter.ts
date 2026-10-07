import {FILTER_VERTEX} from './filter-vertex'
import {Filter, GlProgram, UniformGroup} from 'pixi.js'

export interface PixelPushFilterOptions {
  readonly distanceX: number
  readonly distanceY: number
  readonly featherPixels: number
  readonly height: number
  readonly width: number
  readonly x: number
  readonly y: number
}

const PIXEL_PUSH_FRAGMENT = `
in vec2 vTextureCoord;
out vec4 finalColor;

uniform sampler2D uTexture;
uniform vec4 uInputClamp;
uniform highp vec4 uInputSize;
uniform vec4 uRegionPixels;
uniform vec2 uDistancePixels;
uniform float uFeatherPixels;
uniform float uProgress;

void main(void) {
  vec2 pixelCoordinate = vTextureCoord * uInputSize.xy;
  vec2 regionStart = uRegionPixels.xy;
  vec2 regionEnd = regionStart + uRegionPixels.zw;
  vec2 edgeDistance = min(pixelCoordinate - regionStart, regionEnd - pixelCoordinate);
  float feather = max(uFeatherPixels, 0.001);
  float regionWeight = smoothstep(0.0, feather, min(edgeDistance.x, edgeDistance.y));
  vec2 sampleOffset = uDistancePixels * uProgress * regionWeight * uInputSize.zw;
  vec2 sampleCoordinate = clamp(vTextureCoord - sampleOffset, uInputClamp.xy, uInputClamp.zw);
  finalColor = texture(uTexture, sampleCoordinate);
}
`

interface PixelPushUniforms {
  uProgress: number
}

export class PixelPushFilter extends Filter {
  readonly #uniforms: PixelPushUniforms

  constructor(options: PixelPushFilterOptions) {
    const uniformGroup = new UniformGroup({
      uDistancePixels: {
        type: 'vec2<f32>',
        value: new Float32Array([options.distanceX, options.distanceY]),
      },
      uFeatherPixels: {type: 'f32', value: options.featherPixels},
      uProgress: {type: 'f32', value: 0},
      uRegionPixels: {
        type: 'vec4<f32>',
        value: new Float32Array([options.x, options.y, options.width, options.height]),
      },
    })

    super({
      antialias: 'off',
      glProgram: GlProgram.from({
        fragment: PIXEL_PUSH_FRAGMENT,
        name: 'focus-room-pixel-push',
        vertex: FILTER_VERTEX,
      }),
      resources: {
        pixelPushUniforms: uniformGroup,
      },
    })

    this.#uniforms = uniformGroup.uniforms as PixelPushUniforms
  }

  setProgress(progress: number) {
    this.#uniforms.uProgress = progress
  }
}
