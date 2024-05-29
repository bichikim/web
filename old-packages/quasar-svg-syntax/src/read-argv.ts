import yargs from 'yargs'
import {hideBin} from 'yargs/helpers'

export const readArgv = (rawArgv: string[]) => {
  const {argv} = yargs(hideBin(rawArgv))

  const {_}: any = argv

  const directory: undefined | string = String(_?.[0])

  return {
    cwd: process.cwd(),
    directory,
  }
}
