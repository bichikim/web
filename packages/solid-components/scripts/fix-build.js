// oxlint-disable eslint-js/require-unicode-regexp
// oxlint-disable eslint-js/prefer-named-capture-group
import {readFileSync, writeFileSync} from 'node:fs'
const modulePath = await import.meta.resolve('rollup-preset-solid')

const modulePathBody = modulePath.replace(/^file:\/\/\/(\w:\/)?/u, '/')

console.log(modulePathBody, modulePath)

const code = readFileSync(modulePathBody, 'utf8')

// fix local import file extensions has bug
const removedNodeNextPluginCode = code.replace(
  /{\n\s*name: "fix-import-extensions",\n(.|\n)*emit\(\);\n\s*}\n\s*},/,
  '',
)

writeFileSync(modulePathBody, removedNodeNextPluginCode)
