/* eslint-disable no-tabs,max-len,prettier/prettier,unicorn/prevent-abbreviations */
import nodeFs from 'node:fs'
import nodePath from 'node:path'
import {glob} from 'glob'

const fix = async () => {
  const src = process.env.VERCEL === '1' ? nodePath.resolve('.vercel/output/functions/__nitro.func/chunks/nitro/nitro.mjs') : nodePath.resolve('.output/server/chunks/nitro/nitro.mjs')
  const scriptJs = await nodeFs.promises.readFile(src, 'utf8')

  await nodeFs.promises.writeFile(src, scriptJs.replace(`
function getDefaultExportFromNamespaceIfNotNamed (n) {
	return n && Object.prototype.hasOwnProperty.call(n, 'default') && Object.keys(n).length === 1 ? n['default'] : n;
}`, `
// hot fixed
function getDefaultExportFromNamespaceIfNotNamed (n) {
	return n && Object.prototype.hasOwnProperty.call(n, 'default') && (Object.keys(n).length === 1 || (Object.prototype.hasOwnProperty.call(n, '__esModule') && Object.keys(n).length === 2) ) ? n['default'] : n;
}`), 'utf8')
}

const fixSw = async () => {
  const files = await glob('.vinxi/build/client/_sw/*.js')
  const dest = nodePath.resolve('.output/public')

  return Promise.all(files.map((file) => {
    const filename = nodePath.basename(file)

    return nodeFs.promises.copyFile(file, nodePath.join(dest, filename))
  }))
}

fix().then(() => console.info('hot fix done'))
fixSw().then(() => console.info('hot fix sw done'))
