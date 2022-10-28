import {asyncReadFile} from './async-read-file'
import path from 'path'
import {generate} from './generate'
import {camelCase, last} from 'lodash'
import fg from 'fast-glob'

export interface GenerateOptions {
  cwd: string
  directory?: string | string[]
  dist?: string
  namePrefix?: string
}

export const generateFiles = async (options: GenerateOptions) => {
  const {directory, cwd, namePrefix = ''} = options

  if (!directory) {
    return
  }
  //
  const paths = await fg(directory)

  const svgStrings = await Promise.all(
    paths.map(async (item) => {
      const data: string = await asyncReadFile(path.resolve(cwd, item), 'utf8')
      const code = await generate(data)
      return {
        code,
        name: camelCase(namePrefix + last(item.replace(/\..{3}$/u, '').split('/'))),
      }
    }),
  )

  return `/* eslint-disable */ \n export default {${svgStrings
    .map(({name, code}) => `${name}: '${code}'`)
    .join(',')}}`
}
