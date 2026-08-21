import {Filter, GlProgram, type Texture, UniformGroup} from 'pixi.js'

const FILTER_VERTEX = `
in vec2 aPosition;
out vec2 vTextureCoord;
out vec2 vDepthCoord;

uniform vec4 uInputSize;
uniform vec4 uOutputFrame;
uniform vec4 uOutputTexture;

void main(void) {
  vec2 position = aPosition * uOutputFrame.zw + uOutputFrame.xy;
  position.x = position.x * (2.0 / uOutputTexture.x) - 1.0;
  position.y = position.y * (2.0 * uOutputTexture.z / uOutputTexture.y) - uOutputTexture.z;
  gl_Position = vec4(position, 0.0, 1.0);
  vTextureCoord = aPosition * (uOutputFrame.zw * uInputSize.zw);
  // Filter textures may use padded render-target UVs; DA3 maps always use scene UVs.
  vDepthCoord = aPosition;
}
`

const DEPTH_FRAGMENT = `
in vec2 vTextureCoord;
in vec2 vDepthCoord;
out vec4 finalColor;

uniform sampler2D uTexture;
uniform sampler2D uDepthTexture;
uniform sampler2D uNextDepthTexture;
uniform vec4 uInputClamp;
uniform highp vec4 uInputSize;
uniform vec2 uPointerPixels;
uniform float uDepthMix;

float getDepthResponse(float proximity) {
  if (proximity < 0.45) {
    float backgroundMix = smoothstep(0.05, 0.45, proximity);
    return mix(-1.0, -0.5, backgroundMix);
  }

  if (proximity < 0.88) {
    float characterMix = smoothstep(0.45, 0.88, proximity);
    return mix(-0.5, 0.15, characterMix);
  }

  float foregroundMix = smoothstep(0.88, 1.0, proximity);
  return mix(0.15, 0.3, foregroundMix);
}

void main(void) {
  float currentDepth = texture(uDepthTexture, vDepthCoord).r;
  float nextDepth = texture(uNextDepthTexture, vDepthCoord).r;
  float proximity = mix(currentDepth, nextDepth, uDepthMix);
  vec2 axisScale = vec2(1.0, 0.35);
  vec2 depthOffset = uInputSize.zw * uPointerPixels * axisScale * getDepthResponse(proximity);
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
        vertex: FILTER_VERTEX,
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
