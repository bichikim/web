export const RAIN_MAP_ERASER = `
float rainMapEraser(vec2 uv) {
 return smoothstep(0.93, 1.0, texture(uRainMap, uv).a);
}
`
