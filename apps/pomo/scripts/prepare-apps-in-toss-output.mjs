import {readdir, rm} from 'node:fs/promises'
import path from 'node:path'

const outputDirectory = path.resolve('.output/public')
const precompressedSuffixes = ['.br', '.gz']

const listFiles = async (directory) => {
  const entries = await readdir(directory, {withFileTypes: true})
  const nestedFiles = await Promise.all(
    entries.map(async (entry) => {
      const entryPath = path.join(directory, entry.name)

      if (entry.isDirectory()) {
        return listFiles(entryPath)
      }

      return entry.isFile() ? [entryPath] : []
    }),
  )

  return nestedFiles.flat()
}

const isPrecompressedCopy = (filePath, availableFiles) => {
  const suffix = precompressedSuffixes.find((candidate) => filePath.endsWith(candidate))

  if (suffix === undefined) {
    return false
  }

  return availableFiles.has(filePath.slice(0, -suffix.length))
}

const isRedundantPackageAsset = (filePath, availableFiles) => {
  const fileName = path.basename(filePath)

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
