import {DEPTH_RESPONSE} from 'src/utils/shader'
export const DEPTH_PARALLAX_FRAGMENT = `
uniform sampler2D uDepthTexture;
uniform vec2 uParallaxPixels;

${DEPTH_RESPONSE}

vec2 parallaxUv(vec2 viewportUv, vec2 depthUv, vec2 viewportSize) {
  float proximity = texture(uDepthTexture, depthUv).r;
  vec2 movement = uParallaxPixels / viewportSize * vec2(1.0, 0.35) * depthResponse(proximity);
  return clamp((viewportUv - 0.5) * 0.96 + 0.5 + movement, 0.0, 1.0);
}
`
