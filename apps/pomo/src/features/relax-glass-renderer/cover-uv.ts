export const COVER_UV = `
vec2 coverUv(vec2 uv, vec2 sourceSize, float horizontalAlignment) {
  float viewportAspect = uViewportSize.x / uViewportSize.y;
  float sourceAspect = sourceSize.x / sourceSize.y;
  if (viewportAspect > sourceAspect) {
    float visibleHeight = sourceAspect / viewportAspect;
    return vec2(uv.x, (uv.y - 0.5) * visibleHeight + 0.5);
  }
  float visibleWidth = viewportAspect / sourceAspect;
  return vec2(uv.x * visibleWidth + (1.0 - visibleWidth) * horizontalAlignment, uv.y);
}

`
