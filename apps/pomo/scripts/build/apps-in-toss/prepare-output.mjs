// Removes redundant .br/.gz files and unused ORT WASM copies from the AIT package.
import {readdir, rm} from 'node:fs/promises'
import path from 'node:path'

const outputDirectory = path.resolve('.output/public')
const precompressedSuffixes = ['.br', '.gz']
const excludedPackagePaths = new Set([path.join('localization', 'redirect.js')])

const listFiles = async (directory) =>
  (await readdir(directory, {recursive: true, withFileTypes: true}))
    .filter((entry) => entry.isFile())
    .map((entry) => path.join(entry.parentPath, entry.name))

const isPrecompressedCopy = (filePath, availableFiles) => {
  const suffix = precompressedSuffixes.find((candidate) => filePath.endsWith(candidate))

  if (suffix === undefined) {
    return false
  }

  return availableFiles.has(filePath.slice(0, -suffix.length))
}

const isRedundantPackageAsset = (filePath, availableFiles) => {
  const fileName = path.basename(filePath)

  if (excludedPackagePaths.has(path.relative(outputDirectory, filePath))) {
    return true
  }

  if (isPrecompressedCopy(filePath, availableFiles)) {
    return true
  }

  // AI_NOTE - Both Transformers.js and Supertonic point ORT at its versioned CDN, so emitted WASM copies only inflate the AIT artifact.
  return fileName.startsWith('ort-wasm-') && fileName.endsWith('.wasm')
}

const files = await listFiles(outputDirectory)
const availableFiles = new Set(files)
const redundantFiles = files.filter((filePath) => isRedundantPackageAsset(filePath, availableFiles))

await Promise.all(redundantFiles.map((filePath) => rm(filePath)))

console.log(`Removed ${redundantFiles.length} redundant files from the Apps in Toss package.`)
