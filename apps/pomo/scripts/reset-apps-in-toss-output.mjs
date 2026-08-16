import {rm} from 'node:fs/promises'
import path from 'node:path'

// AI_NOTE - AIT packaging needs Node 24; other workspace tasks still support Node 22.
const MINIMUM_NODE_MAJOR_VERSION = 24
const DEFAULT_APP_NAME = 'pomo-app'

const nodeMajorVersion = Number.parseInt(process.versions.node, 10)

if (nodeMajorVersion < MINIMUM_NODE_MAJOR_VERSION) {
  throw new Error(
    `AIT packaging requires Node.js ${MINIMUM_NODE_MAJOR_VERSION} or later; current: ${process.versions.node}`,
  )
}

const appName = process.env.POMO_APPS_IN_TOSS_APP_NAME ?? DEFAULT_APP_NAME
const appDirectory = path.resolve('.')
const artifactName = `${appName}.ait`
const artifactPath = path.resolve(appDirectory, artifactName)

if (appName.length === 0 || path.basename(artifactName) !== artifactName) {
  throw new Error(`Apps in Toss appName must be a file-safe name. Received: ${appName}`)
}

const outputDirectory = path.resolve(appDirectory, '.output/public')

await Promise.all([
  rm(outputDirectory, {force: true, recursive: true}),
  rm(artifactPath, {force: true}),
])
