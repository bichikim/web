import {RAIN_MAP_ERASER} from './rain-map-eraser'
import {Filter, GlProgram, type Texture, UniformGroup} from 'pixi.js'

import {FULLSCREEN_VERTEX} from 'src/utils/fullscreen-vertex'

const FRAGMENT = `
in vec2 vUv;
out vec4 finalColor;
uniform sampler2D uMistMap;
uniform sampler2D uRainMap;
uniform float uGrowth;

${RAIN_MAP_ERASER}
void main() {
  float eraser = rainMapEraser(vUv);
  float mist = min(texture(uMistMap, vUv).r + uGrowth, 1.0) * (1.0 - eraser);
  finalColor = vec4(mist, 0.0, 0.0, 1.0);
}
`

interface MistUniforms {
  uGrowth: number
}

/** Accumulates condensation and removes it under the current raindrop silhouettes. */
export class MistEvolutionFilter extends Filter {
  readonly #uniforms: MistUniforms

  constructor(mistMap: Texture, rainMap: Texture) {
    const uniforms = new UniformGroup({uGrowth: {type: 'f32', value: 0}})
    super({
      glProgram: GlProgram.from({
        fragment: FRAGMENT,
        name: 'relax-mist-evolution',
        vertex: FULLSCREEN_VERTEX,
      }),
      resources: {
        mistUniforms: uniforms,
        uMistMap: mistMap.source,
        uMistMapSampler: mistMap.source.style,
        uRainMap: rainMap.source,
        uRainMapSampler: rainMap.source.style,
      },
    })
    this.#uniforms = uniforms.uniforms as MistUniforms
  }

  setGrowth(amount: number) {
    this.#uniforms.uGrowth = amount
  }
}
