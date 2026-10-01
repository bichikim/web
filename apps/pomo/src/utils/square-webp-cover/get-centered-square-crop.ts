export const getCenteredSquareCrop = (width: number, height: number) => {
  const sourceSize = Math.min(width, height)
  return {sourceSize, sourceX: (width - sourceSize) / 2, sourceY: (height - sourceSize) / 2}
}
