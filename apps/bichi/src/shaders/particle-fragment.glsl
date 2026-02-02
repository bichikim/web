// Iridescent particles: sphere lighting (3D circle look) + depth fade + rainbow cosPalette
uniform float uTime;
varying float vAlpha;
varying float vDepth;
varying float vSeed;

vec3 cosPalette(float t, vec3 a, vec3 b, vec3 c, vec3 d) {
  return a + b * cos(6.28318 * (c * t + d));
}

void main() {
  vec2 c = gl_PointCoord - 0.5;
  float d = dot(c, c);
  if (d > 0.25) discard;

  float z = sqrt(0.25 - d);
  vec3 N = normalize(vec3(2.0 * c.x, 2.0 * c.y, 2.0 * z));
  vec3 lightDir = normalize(vec3(0.4, 0.5, 0.8));
  float diffuse = max(0.0, dot(N, lightDir));
  float shade = 0.35 + 0.65 * diffuse;

  float phase = vSeed + uTime * 0.25;
  vec3 baseA = vec3(0.68, 0.75, 0.92);
  vec3 baseB = vec3(0.42, 0.38, 0.35);
  vec3 baseC = vec3(1.0, 1.0, 1.0);
  vec3 baseD = vec3(0.0, 0.33, 0.67);
  vec3 col = cosPalette(phase, baseA, baseB, baseC, baseD);
  col = mix(col, vec3(1.0), 0.2);
  col *= shade;

  float depthFade = 1.0 - smoothstep(2.0, 6.0, vDepth);
  float a = vAlpha * depthFade;

  gl_FragColor = vec4(col, a);
}
