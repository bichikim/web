// Prints runtime dependency licenses as a table and fails when any license remains UNKNOWN.
import {access, readFile, realpath} from 'node:fs/promises'
import {dirname, join, parse} from 'node:path'
import {fileURLToPath} from 'node:url'

const LICENSE_FILE_NAMES = ['LICENSE', 'LICENSE.md', 'LICENSE.txt', 'LICENCE', 'LICENCE.md']
const NON_RUNTIME_PACKAGE_NAMES = new Set(['@apps-in-toss/cli'])
const packageFilePath = fileURLToPath(new URL('../../../package.json', import.meta.url))

const readPackage = async (path) => JSON.parse(await readFile(path, 'utf8'))

const resolvePackageFile = async (packageName, importerPath) => {
  let currentDirectory = dirname(importerPath)

  while (currentDirectory !== parse(currentDirectory).root) {
    const candidatePath = join(currentDirectory, 'node_modules', packageName, 'package.json')

    try {
      // oxlint-disable-next-line no-await-in-loop -- Node resolution must stop at the nearest ancestor package.
      await access(candidatePath)
      // oxlint-disable-next-line no-await-in-loop -- Resolve the same nearest package before continuing the search.
      return await realpath(candidatePath)
    } catch {
      // Continue through Node's ancestor node_modules lookup path.
    }

    currentDirectory = dirname(currentDirectory)
  }

  throw new Error(`${packageName}의 package.json을 찾지 못했습니다.`)
}

const findLicenseFile = async (directory) => {
  for (const fileName of LICENSE_FILE_NAMES) {
    try {
      // oxlint-disable-next-line no-await-in-loop -- Preserve the preferred license filename order.
      await access(join(directory, fileName))
      return fileName
    } catch {
      // Continue through the known license file names.
    }
  }

  return undefined
}

const getLicense = async (packageData, packagePath) => {
  if (typeof packageData.license === 'string') {
    return packageData.license
  }

  if (Array.isArray(packageData.licenses)) {
    return packageData.licenses
      .map((license) => (typeof license === 'string' ? license : license.type))
      .filter(Boolean)
      .join(' OR ')
  }

  const licenseFile = await findLicenseFile(dirname(packagePath))
  return licenseFile === undefined ? 'UNKNOWN' : `SEE ${licenseFile}`
}

const licenses = new Map()

const visitDependency = async (packageName, importerPath, optional = false) => {
  if (NON_RUNTIME_PACKAGE_NAMES.has(packageName)) {
    return
  }

  let dependencyPath

  try {
    dependencyPath = await resolvePackageFile(packageName, importerPath)
  } catch (error) {
    if (optional) {
      return
    }

    throw error
  }

  const dependency = await readPackage(dependencyPath)
  const key = `${dependency.name}@${dependency.version}`

  if (licenses.has(key)) {
    return
  }

  licenses.set(key, await getLicense(dependency, dependencyPath))

  await Promise.all(
    Object.keys(dependency.dependencies ?? {}).map((childName) =>
      visitDependency(childName, dependencyPath),
    ),
  )

  await Promise.all(
    Object.keys(dependency.optionalDependencies ?? {}).map((childName) =>
      visitDependency(childName, dependencyPath, true),
    ),
  )
}

const application = await readPackage(packageFilePath)

await Promise.all(
  Object.keys(application.dependencies ?? {}).map((dependencyName) =>
    visitDependency(dependencyName, packageFilePath),
  ),
)

const rows = Array.from(licenses, ([name, license]) => ({license, name})).sort((first, second) =>
  first.name.localeCompare(second.name),
)

console.log('| Package | License |')
console.log('| --- | --- |')

for (const row of rows) {
  console.log(`| ${row.name} | ${row.license} |`)
}

if (rows.some((row) => row.license === 'UNKNOWN')) {
  process.exitCode = 1
}
