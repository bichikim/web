const windowRoot = /(?<root>^\w:)(?<restPath>\\.*)/u
export const splitWindowRoot = (path: string) => {
  const {root, restPath} = path.match(windowRoot)?.groups ?? {}

  return {
    restPath,
    root,
  }
}
