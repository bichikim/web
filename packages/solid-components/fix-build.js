import {readFileSync, writeFileSync} from 'node:fs'
const modulePath = await import.meta.resolve('rollup-preset-solid')

const modulePathBody = modulePath.replace(/^file:\/\/\/(\w:\/)?/u, '/')

console.log(modulePathBody, modulePath)

const code = readFileSync(modulePathBody, 'utf8')

const removedNodeNextPluginCode = code.replace(
  // eslint-disable-next-line require-unicode-regexp
  /{\n\s*name: "fix-import-extensions",\n(.|\n)*emit\(\);\n\s*}\n\s*},/,
  '',
)

writeFileSync(modulePathBody, removedNodeNextPluginCode)
