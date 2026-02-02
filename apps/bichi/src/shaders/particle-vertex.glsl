// Particles: orbit + depth fade; seed for rainbow (no twinkle)
attribute float aSeed;
uniform float uTime;
uniform float uScrollNormalized;
uniform float uPointSize;

varying float vAlpha;
varying float vDepth;
varying float vSeed;

void main() {
  float t = uTime + aSeed * 6.28;
  float scroll = 1.0 + uScrollNormalized * 1.5;

  vec3 pos = position;
  float orbit = uTime * 0.12 + aSeed * 6.28;
  float cx = cos(orbit) * pos.x - sin(orbit) * pos.z;
  float cz = sin(orbit) * pos.x + cos(orbit) * pos.z;
  pos.x = cx;
  pos.z = cz;
  pos.x += sin(t) * 0.2 * scroll;
  pos.y += cos(t * 0.85) * 0.2 * scroll;
  pos.z += sin(t * 0.6) * 0.15 * scroll;

  vec4 mv = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mv;
  vDepth = -mv.z;
  vAlpha = 1.0;
  vSeed = aSeed;
  gl_PointSize = uPointSize * (1.0 / -mv.z);
}
