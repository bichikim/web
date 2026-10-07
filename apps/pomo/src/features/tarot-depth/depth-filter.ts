import {Filter, GlProgram, type Texture, UniformGroup} from 'pixi.js'
import {FILTER_SCENE_VERTEX} from '../focus-room-animation/filter-vertex'

const HORIZONTAL_DEPTH_SHIFT = 13
const VERTICAL_DEPTH_SHIFT = 8

const FRAGMENT = `
in vec2 vTextureCoord;
in vec2 vSceneCoord;
out vec4 finalColor;
uniform sampler2D uTexture;
uniform sampler2D uDepthTexture;
uniform vec4 uInputClamp;
uniform highp vec4 uInputSize;
uniform vec2 uOffset;

void main(void) {
  vec2 uv = vSceneCoord;
  float proximity = texture(uDepthTexture, uv).r;
  vec2 offset = uOffset * (proximity - 0.5);
  vec2 sampleUv = clamp(vTextureCoord + offset * uInputSize.zw, uInputClamp.xy, uInputClamp.zw);
  float pictureWindow = step(0.04, uv.x) * step(uv.x, 0.96)
    * step(0.035, uv.y) * step(uv.y, 0.84);
  finalColor = texture(uTexture, sampleUv) * pictureWindow;
}
`

/** Displaces a frameless illustration by its estimated depth. */
export class TarotDepthFilter extends Filter {
  readonly #offset: Float32Array

  constructor(texture: Texture) {
    const offset = new Float32Array([0, 0])
    super({
      antialias: 'off',
      glProgram: GlProgram.from({
        fragment: FRAGMENT,
        name: 'tarot-depth',
        vertex: FILTER_SCENE_VERTEX,
      }),
      resources: {
        depthUniforms: new UniformGroup({uOffset: {type: 'vec2<f32>', value: offset}}),
        uDepthSampler: texture.source.style,
        uDepthTexture: texture.source,
      },
    })
    this.#offset = offset
  }

  setOffset(x: number, y: number) {
    this.#offset[0] = x * HORIZONTAL_DEPTH_SHIFT
    this.#offset[1] = y * VERTICAL_DEPTH_SHIFT
  }
}
