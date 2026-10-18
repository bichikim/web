export const DEPTH_RESPONSE = `
float depthResponse(float proximity) {
  if (proximity < 0.45) {
    return mix(-1.0, -0.5, smoothstep(0.05, 0.45, proximity));
  }
  if (proximity < 0.88) {
    return mix(-0.5, 0.15, smoothstep(0.45, 0.88, proximity));
  }
  return mix(0.15, 0.3, smoothstep(0.88, 1.0, proximity));
}

`
