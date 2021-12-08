import yargs from 'yargs'
import {hideBin} from 'yargs/helpers'
import {parse} from 'node-html-parser'
import fs from 'fs'
import fg from 'fast-glob'
import path from 'path'
import {promisify} from '@winter-love/utils'
import {camelCase, last} from 'lodash'

export interface GeneratorOptions {
  cwd: string
  directory?: string | string[]
  dist?: string
  namePrefix?: string
}

export const readArgv = () => {
  const {argv} = yargs(hideBin(process.argv))

  const {_} = argv

  const directory: undefined | string = String(_?.[0])

  return {
    cwd: process.cwd(),
    directory,
  }
}

const asyncReadFile = promisify<(
  path: string,
  encode: string,
  callback: (error: any, data: string) => any,
) => any>(
  fs.readFile as any,
  )

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

export const generateFiles = async (options: GeneratorOptions) => {
  const {directory, cwd, namePrefix = ''} = options

  if (!directory) {
    return
  }
  //
  const paths = await fg(directory)

  const svgStrings = await Promise.all(paths.map(async (item) => {
    const data: string = await asyncReadFile(path.resolve(cwd, item), 'utf8')
    const code = await generate(data)
    return {
      code,
      name: camelCase(namePrefix + last(item.replace(/\..{3}$/u, '').split('/'))),
    }
  }))

  return `/* eslint-disable */ \n export default {${svgStrings.map(({name, code}) => `${name}: '${code}'`).join(',')}}`
}

export const generator = async (options: GeneratorOptions) => {
  const {dist = 'generated.ts', cwd} = options
  const code = await generateFiles(options)

  if (!code) {
    return
  }

  return fs.writeFileSync(path.resolve(cwd, dist), code)
}

generator(readArgv())
