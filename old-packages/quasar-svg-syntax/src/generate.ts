import {parse} from 'node-html-parser'

export const generate = async (svg: string) => {
  const parsedData = parse(svg)

  const rootNode = parsedData.querySelector('svg')

  if (!rootNode) {
    return null
  }

  const viewBox = rootNode.getAttribute('viewBox')

  const paths = rootNode.querySelectorAll('path')

  const pathStrings = paths.map((path) => {
    let dataString = path.getAttribute('d')
    const style = path.getAttribute('style')
    const transform = path.getAttribute('transform')
    if (style) {
      dataString += `@@${style}`
    }
    if (transform) {
      dataString += `@@${transform}`
    }

    return dataString
  })

  return pathStrings.join('&&') + (viewBox ? `|${viewBox}` : '')
}
