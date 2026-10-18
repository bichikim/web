import {RAIN_MAP_ERASER} from './rain-map-eraser'
import {Filter, GlProgram, type Texture} from 'pixi.js'

import {FULLSCREEN_VERTEX} from 'src/utils/shader'

const FRAGMENT = `
in vec2 vUv;
out vec4 finalColor;
uniform sampler2D uDropletMap;
uniform sampler2D uRainMap;

${RAIN_MAP_ERASER}
void main() {
  float eraser = rainMapEraser(vUv);
  finalColor = texture(uDropletMap, vUv) * (1.0 - eraser);
}
`

/** Removes accumulated tiny droplets where a moving raindrop passes. */
export class DropletEraseFilter extends Filter {
  constructor(dropletMap: Texture, rainMap: Texture) {
    super({
      glProgram: GlProgram.from({
        fragment: FRAGMENT,
        name: 'relax-droplet-erase',
        vertex: FULLSCREEN_VERTEX,
      }),
      resources: {
        uDropletMap: dropletMap.source,
        uDropletMapSampler: dropletMap.source.style,
        uRainMap: rainMap.source,
        uRainMapSampler: rainMap.source.style,
      },
    })
  }
}
