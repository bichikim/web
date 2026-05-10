import fs from 'node:fs'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {createConfig} from '@winter-love/vite-lib-config'

const root = path.dirname(fileURLToPath(import.meta.url))
const srcDir = path.join(root, 'src')

const subpathEntries = Object.fromEntries(
  fs
    .readdirSync(srcDir, {withFileTypes: true})
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => dirent.name)
    .filter((name) => fs.existsSync(path.join(srcDir, name, 'index.ts')))
    .filter((name) => name !== '__tests__')
    .map((name) => [`${name}/index`, path.join('src', name, 'index.ts')]),
)

export default createConfig({
  entry: subpathEntries,
})
