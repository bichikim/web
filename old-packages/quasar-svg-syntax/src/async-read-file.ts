import fs from 'node:fs'
import {promisify} from '@winter-love/utils'

export type FsReadFile = (
  path: string,
  encode: string,
  callback: (error: any, data: string) => any,
) => void

export const asyncReadFile = promisify<FsReadFile>(fs.readFile as any)
