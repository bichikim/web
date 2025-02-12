import {readFileSync, writeFileSync} from 'node:fs'
const modulePath = await import.meta.resolve('rollup-preset-solid')

const code = readFileSync(modulePath.replace('file://', ''), 'utf8')

const removedNodeNextPluginCode = code.replace(
  // eslint-disable-next-line require-unicode-regexp
  /{\n\s*name: "fix-import-extensions",\n(.|\n)*emit\(\);\n\s*}\n\s*},/,
  '',
)

writeFileSync(modulePath.replace('file://', ''), removedNodeNextPluginCode)
