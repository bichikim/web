const windowRoot = /(?<root>^\w:)(?<restPath>\\.*)/u

export const splitWindowRoot = (path: string) => {
  const {root, restPath} = path.match(windowRoot)?.groups ?? {}

  if (restPath) {
    return {
      restPath,
      root,
    }
  }

  return {
    restPath: path,
  }
}
