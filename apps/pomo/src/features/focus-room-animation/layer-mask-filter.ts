import {Filter, GlProgram, type Texture} from 'pixi.js'

export interface LayerMaskFilterOptions {
  readonly maskTexture: Texture
}

const FILTER_VERTEX = `
in vec2 aPosition;
out vec2 vMaskCoord;
out vec2 vTextureCoord;

uniform vec4 uInputSize;
uniform vec4 uOutputFrame;
uniform vec4 uOutputTexture;

void main(void) {
  vec2 position = aPosition * uOutputFrame.zw + uOutputFrame.xy;
  position.x = position.x * (2.0 / uOutputTexture.x) - 1.0;
  position.y = position.y * (2.0 * uOutputTexture.z / uOutputTexture.y) - uOutputTexture.z;
  gl_Position = vec4(position, 0.0, 1.0);
  vTextureCoord = aPosition * (uOutputFrame.zw * uInputSize.zw);
  vMaskCoord = aPosition;
}
`

const LAYER_MASK_FRAGMENT = `
in vec2 vMaskCoord;
in vec2 vTextureCoord;
out vec4 finalColor;

uniform sampler2D uTexture;
uniform sampler2D uMaskTexture;

void main(void) {
  float maskWeight = texture(uMaskTexture, vMaskCoord).r;
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
        vertex: FILTER_VERTEX,
      }),
      resources: {
        uMaskSampler: options.maskTexture.source.style,
        uMaskTexture: options.maskTexture.source,
      },
    })
  }
}
