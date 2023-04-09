const windowRoot = /(?<root>^\w:)(?<restPath>\\.*)/u
export const splitWindowRoot = (path: string): [undefined | string, string] => {
  const {root, restPath} = path.match(windowRoot)?.groups ?? {}

  if (!root) {
    return [undefined, path]
  }

  return [root, restPath]
}
