import {expect, test} from 'vitest'
import {createWindowsCommand} from '../create-windows-command'

test.each([
  {
    name: 'ordinary drive paths',
    path: String.raw`C:\Program Files\Poffo\poffo-cli.exe`,
    target: String.raw`C:\Program Files\Poffo\poffo-cli.exe`,
  },
  {
    name: 'verbatim drive paths',
    path: String.raw`\\?\D:\Poffo App\poffo-cli.exe`,
    target: String.raw`D:\Poffo App\poffo-cli.exe`,
  },
  {
    name: 'verbatim UNC paths',
    path: String.raw`\\?\UNC\server\share\Poffo App\poffo-cli.exe`,
    target: String.raw`\\server\share\Poffo App\poffo-cli.exe`,
  },
  {
    name: 'literal batch expansion characters',
    path: String.raw`\\?\C:\100%\Poffo App\poffo-cli.exe`,
    target: String.raw`C:\100%%\Poffo App\poffo-cli.exe`,
  },
])('should generate a quoted batch command for $name', ({path, target}) => {
  expect(createWindowsCommand(path)).toBe(`@echo off\r\n"${target}" %*\r\n`)
})
