const skipHead = (list: string[], skipHead: string[] = []) => {
  const [head, ...result] = list
  if (!skipHead.includes(head)) {
    result.unshift(head)
  }
  return result
}

const storyBookName = (name: string) => {
  return name.replace(/\.story.vue/u, '')
}

export interface HistoireTreeOptions {
  removePaths?: string[]
  skipHeadPaths?: string[]
}

export const histoireTree = (path: string, options: HistoireTreeOptions = {}) => {
  const {removePaths = [], skipHeadPaths = []} = options
  const paths = skipHead(path.split('/'), skipHeadPaths)
  const filename = paths.pop()
  const filteredPaths = paths.filter((path) => !removePaths.includes(path))
  const storyName = storyBookName(filename)
  return [...filteredPaths, storyName]
}
