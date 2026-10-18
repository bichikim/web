import {FILTER_SCENE_VERTEX} from './filter-vertex'
import {DEPTH_RESPONSE} from 'src/utils/shader'
import {Filter, GlProgram, type Texture, UniformGroup} from 'pixi.js'

const DEPTH_FRAGMENT = `
in vec2 vTextureCoord;
in vec2 vSceneCoord;
out vec4 finalColor;

uniform sampler2D uTexture;
uniform sampler2D uDepthTexture;
uniform sampler2D uNextDepthTexture;
uniform vec4 uInputClamp;
uniform highp vec4 uInputSize;
uniform vec2 uPointerPixels;
uniform float uDepthMix;

${DEPTH_RESPONSE}

void main(void) {
  float currentDepth = texture(uDepthTexture, vSceneCoord).r;
  float nextDepth = texture(uNextDepthTexture, vSceneCoord).r;
  float proximity = mix(currentDepth, nextDepth, uDepthMix);
  vec2 axisScale = vec2(1.0, 0.35);
  vec2 depthOffset = uInputSize.zw * uPointerPixels * axisScale * depthResponse(proximity);
  vec2 sampleCoordinate = clamp(vTextureCoord + depthOffset, uInputClamp.xy, uInputClamp.zw);
  finalColor = texture(uTexture, sampleCoordinate);
}
`

interface ParallaxUniforms {
  readonly uPointerPixels: Float32Array
  uDepthMix: number
}

export class DepthParallaxFilter extends Filter {
  readonly #parallaxUniforms: ParallaxUniforms

  constructor(depthTexture: Texture) {
    const uniformGroup = new UniformGroup({
      uDepthMix: {type: 'f32', value: 0},
      uPointerPixels: {type: 'vec2<f32>', value: new Float32Array([0, 0])},
    })

    super({
      antialias: 'off',
      glProgram: GlProgram.from({
        fragment: DEPTH_FRAGMENT,
        name: 'focus-room-depth-parallax',
        preferredFragmentPrecision: 'highp',
        vertex: FILTER_SCENE_VERTEX,
      }),
      resources: {
        parallaxUniforms: uniformGroup,
        uDepthSampler: depthTexture.source.style,
        uDepthTexture: depthTexture.source,
        uNextDepthSampler: depthTexture.source.style,
        uNextDepthTexture: depthTexture.source,
      },
    })

    this.#parallaxUniforms = uniformGroup.uniforms as ParallaxUniforms
  }

  setDepthTransition(texture: Texture) {
    this.resources.uNextDepthTexture = texture.source
    this.resources.uNextDepthSampler = texture.source.style
    this.#parallaxUniforms.uDepthMix = 0
  }

  setDepthMix(progress: number) {
    this.#parallaxUniforms.uDepthMix = progress
  }

  finishDepthTransition() {
    this.resources.uDepthTexture = this.resources.uNextDepthTexture
    this.resources.uDepthSampler = this.resources.uNextDepthSampler
    this.#parallaxUniforms.uDepthMix = 0
  }

  cancelDepthTransition() {
    this.resources.uNextDepthTexture = this.resources.uDepthTexture
    this.resources.uNextDepthSampler = this.resources.uDepthSampler
    this.#parallaxUniforms.uDepthMix = 0
  }

  setPointerOffset(x: number, y: number) {
    this.#parallaxUniforms.uPointerPixels[0] = x
    this.#parallaxUniforms.uPointerPixels[1] = y
  }
}
