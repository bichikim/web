import {clamp} from 'es-toolkit/math'
import {Filter, GlProgram, UniformGroup} from 'pixi.js'
import {FILTER_SCENE_VERTEX} from '../focus-room-animation/filter-vertex'

interface CardOrientation {
  readonly reversed?: boolean
  readonly x: number
  readonly y: number
}

const FRAGMENT = `
in vec2 vTextureCoord;
in vec2 vSceneCoord;
out vec4 finalColor;
uniform sampler2D uTexture;
uniform vec3 uOrientation;

void main(void) {
  vec4 surface = texture(uTexture, vTextureCoord);
  vec2 uv = uOrientation.z > 0.5 ? vec2(1.0) - vSceneCoord : vSceneCoord;
  vec2 tilt = uOrientation.xy;
  float strength = min(length(tilt), 1.0);

  vec2 reflectionCenter = vec2(0.28, 0.22) + tilt * vec2(0.55, 0.45);
  vec2 distance = (uv - reflectionCenter) * vec2(1.0, 1.5);
  float reflection = exp(-dot(distance, distance) * 4.5);
  float band = uv.x * 0.85 + uv.y * 0.45 - (0.48 + tilt.x * 0.48 + tilt.y * 0.28);
  float sheen = exp(-band * band / 0.025);
  float glare = (reflection * 0.20 + sheen * 0.14) * (0.30 + strength * 0.70);

  float lighting = clamp(1.0 - tilt.x * 0.12 - tilt.y * 0.08 - strength * 0.04, 0.80, 1.08);
  vec3 shaded = min(surface.rgb * lighting, vec3(surface.a));
  vec3 reflected = shaded + (vec3(surface.a) - shaded) * glare;
  finalColor = vec4(reflected, surface.a);
}
`

/** Shades the card face and moves its reflection with the displayed orientation. */
export class TarotReflectionFilter extends Filter {
  readonly #orientation: Float32Array

  constructor() {
    const orientation = new Float32Array([0, 0, 0])
    super({
      antialias: 'off',
      glProgram: GlProgram.from({
        fragment: FRAGMENT,
        name: 'tarot-reflection',
        vertex: FILTER_SCENE_VERTEX,
      }),
      resources: {
        reflectionUniforms: new UniformGroup({
          uOrientation: {type: 'vec3<f32>', value: orientation},
        }),
      },
    })
    this.#orientation = orientation
  }

  setOrientation(options: CardOrientation) {
    this.#orientation[0] = clamp(options.x, -1, 1)
    this.#orientation[1] = clamp(options.y, -1, 1)
    this.#orientation[2] = options.reversed ? 1 : 0
  }
}
