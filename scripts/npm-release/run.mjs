import {spawnSync} from 'node:child_process'
import {mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync} from 'node:fs'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {fileURLToPath} from 'node:url'

import {decideRelease, findHighestVersion} from './decision.mjs'

const repositoryDirectory = fileURLToPath(new URL('../..', import.meta.url))
const packagesDirectory = path.join(repositoryDirectory, 'packages')
const mode = process.argv[2] ?? 'check'

const run = (command, arguments_, options = {}) => {
  const result = spawnSync(command, arguments_, {
    cwd: repositoryDirectory,
    encoding: 'utf8',
    ...options,
  })

  if (result.status === 0) {
    return result.stdout?.trim() ?? ''
  }

  const details = [result.stdout, result.stderr].filter(Boolean).join('\n').trim()
  throw new Error(`${command} ${arguments_.join(' ')} failed.${details ? `\n${details}` : ''}`)
}

const readPublicPackages = () =>
  readdirSync(packagesDirectory, {withFileTypes: true})
    .filter((entry) => entry.isDirectory())
    .map((entry) => {
      const directory = path.join(packagesDirectory, entry.name)
      const manifestPath = path.join(directory, 'package.json')

      try {
        const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
        return {
          directory,
          manifest,
          relativeDirectory: path.relative(repositoryDirectory, directory),
        }
      } catch (error) {
        if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
          return null
        }

        throw error
      }
    })
    .filter(
      (entry) =>
        entry !== null &&
        entry.manifest.private !== true &&
        entry.manifest.publishConfig?.access === 'public',
    )
    .sort((left, right) => left.manifest.name.localeCompare(right.manifest.name))

const readPublishedPackage = (packageName) => {
  const versionsResult = spawnSync('npm', ['view', packageName, 'versions', '--json'], {
    cwd: repositoryDirectory,
    encoding: 'utf8',
  })

  if (versionsResult.status !== 0) {
    if (versionsResult.stderr.includes('E404')) {
      return null
    }

    throw new Error(`Could not read ${packageName} from npm.\n${versionsResult.stderr.trim()}`)
  }

  const versionsValue = JSON.parse(versionsResult.stdout)
  const versions = Array.isArray(versionsValue) ? versionsValue : [versionsValue]

  if (versions.length === 0 || versions.some((version) => typeof version !== 'string')) {
    throw new Error(`npm returned an invalid versions response for ${packageName}.`)
  }

  const highestVersion = findHighestVersion(versions)
  const result = spawnSync(
    'npm',
    ['view', `${packageName}@${highestVersion}`, 'version', 'gitHead', '--json'],
    {
      cwd: repositoryDirectory,
      encoding: 'utf8',
    },
  )

  if (result.status !== 0) {
    throw new Error(
      `Could not read ${packageName}@${highestVersion} from npm.\n${result.stderr.trim()}`,
    )
  }

  const value = JSON.parse(result.stdout)

  if (typeof value === 'string') {
    return {gitHead: null, version: highestVersion}
  }

  if (value && typeof value === 'object' && value.version === highestVersion) {
    return {
      gitHead: typeof value.gitHead === 'string' ? value.gitHead : null,
      version: highestVersion,
    }
  }

  throw new Error(`npm returned an invalid version response for ${packageName}.`)
}

const resolveCommit = (revision) => {
  const result = spawnSync('git', ['rev-parse', '--verify', `${revision}^{commit}`], {
    cwd: repositoryDirectory,
    encoding: 'utf8',
  })

  return result.status === 0 ? result.stdout.trim() : null
}

const hasSourceChange = ({entry, published}) => {
  const tag = `${entry.manifest.name}@${published.version}`
  const baseline = resolveCommit(`refs/tags/${tag}`) ?? resolveCommit(published.gitHead)

  if (baseline === null) {
    throw new Error(
      `${entry.manifest.name} has no source baseline for ${published.version}. ` +
        `Create the verified package tag ${tag} before a minor or major release.`,
    )
  }

  const sourceDirectory = path.join(entry.relativeDirectory, 'src')
  const result = spawnSync('git', ['diff', '--quiet', baseline, 'HEAD', '--', sourceDirectory], {
    cwd: repositoryDirectory,
    encoding: 'utf8',
  })

  if (result.status === 0) {
    return false
  }

  if (result.status === 1) {
    return true
  }

  throw new Error(`Could not compare ${entry.manifest.name} source from ${baseline}.`)
}

const createPlan = () =>
  readPublicPackages().map((entry) => {
    const published = readPublishedPackage(entry.manifest.name)
    const publishedVersion = published?.version ?? null
    let decision = decideRelease({
      localVersion: entry.manifest.version,
      publishedVersion,
      sourceChanged: false,
    })

    if (decision.code === 'SOURCE_CHANGE_REQUIRED' && published !== null) {
      decision = decideRelease({
        localVersion: entry.manifest.version,
        publishedVersion,
        sourceChanged: hasSourceChange({entry, published}),
      })
    }

    if (decision.status === 'publish') {
      const releaseTag = `${entry.manifest.name}@${entry.manifest.version}`

      if (resolveCommit(`refs/tags/${releaseTag}`) !== null) {
        decision = {
          code: 'RELEASE_TAG_CONFLICT',
          message: `${releaseTag} already exists although npm does not contain this version.`,
          status: 'error',
        }
      }
    }

    return {decision, entry, publishedVersion}
  })

const printPlan = (plan) => {
  for (const item of plan) {
    const npmVersion = item.publishedVersion ?? 'not published'
    console.log(
      `${item.decision.status.toUpperCase()} ${item.entry.manifest.name} ` +
        `(npm ${npmVersion} → repository ${item.entry.manifest.version}): ${item.decision.message}`,
    )
  }
}

const requireValidPlan = (plan) => {
  const failures = plan.filter((item) => item.decision.status === 'error')

  if (failures.length > 0) {
    throw new Error(
      `Release preflight failed for ${failures.length} package(s). Nothing was published.`,
    )
  }
}

const validateArchive = (item, archive) => {
  const packedManifest = JSON.parse(run('tar', ['-xOf', archive, 'package/package.json']))
  const expectedManifest = item.entry.manifest

  if (
    packedManifest.name !== expectedManifest.name ||
    packedManifest.version !== expectedManifest.version
  ) {
    throw new Error(`${expectedManifest.name} archive has an unexpected package identity.`)
  }

  const dependencySections = [
    packedManifest.dependencies,
    packedManifest.optionalDependencies,
    packedManifest.peerDependencies,
  ].filter((section) => section && typeof section === 'object')
  const workspaceDependencies = dependencySections.flatMap((section) =>
    Object.entries(section).filter(
      ([, version]) => typeof version === 'string' && version.startsWith('workspace:'),
    ),
  )

  if (workspaceDependencies.length > 0) {
    throw new Error(`${expectedManifest.name} archive still contains workspace dependencies.`)
  }
}

const packReleases = (releases, temporaryDirectory) =>
  releases.map((item) => {
    run('pnpm', ['--dir', item.entry.directory, 'run', 'build'], {stdio: 'inherit'})
    const packageDirectory = path.join(
      temporaryDirectory,
      item.entry.manifest.name.replaceAll('/', '-').replaceAll('@', ''),
    )
    mkdirSync(packageDirectory)
    run('pnpm', ['--dir', item.entry.directory, 'pack', '--pack-destination', packageDirectory], {
      stdio: 'inherit',
    })
    const archives = readdirSync(packageDirectory).filter((fileName) => fileName.endsWith('.tgz'))

    if (archives.length !== 1) {
      throw new Error(`${item.entry.manifest.name} did not produce exactly one npm archive.`)
    }

    const archive = path.join(packageDirectory, archives[0])
    validateArchive(item, archive)
    return {...item, archive}
  })

const publishRelease = (item) => {
  const {name, version} = item.entry.manifest
  const tag = `${name}@${version}`
  run('npm', ['publish', item.archive, '--access', 'public', '--tag', item.decision.npmTag], {
    stdio: 'inherit',
  })
  run('git', ['tag', '--annotate', tag, '--message', `${name} ${version}`])
  run('git', ['push', 'origin', `refs/tags/${tag}`], {stdio: 'inherit'})
  run(
    'gh',
    [
      'release',
      'create',
      tag,
      '--verify-tag',
      '--title',
      `${name} ${version}`,
      '--notes',
      `Published ${name}@${version} to npm with the ${item.decision.npmTag} dist-tag.`,
    ],
    {stdio: 'inherit'},
  )
}

const execute = () => {
  if (mode !== 'check' && mode !== 'pack' && mode !== 'publish') {
    throw new Error(`Unknown npm release mode: ${mode}`)
  }

  const plan = createPlan()
  printPlan(plan)
  requireValidPlan(plan)

  if (mode === 'check') {
    return
  }

  const releases = plan.filter((item) => item.decision.status === 'publish')

  if (releases.length === 0) {
    console.log('No npm packages need publication.')
    return
  }

  const temporaryDirectory = mkdtempSync(path.join(tmpdir(), 'npm-release-'))

  try {
    const packedReleases = packReleases(releases, temporaryDirectory)

    if (mode === 'pack') {
      console.log(`Verified ${packedReleases.length} npm package archive(s).`)
      return
    }

    if (process.env.GITHUB_ACTIONS !== 'true' || process.env.GITHUB_REF !== 'refs/heads/main') {
      throw new Error('Publishing is allowed only from the main branch in GitHub Actions.')
    }

    packedReleases.forEach(publishRelease)
  } finally {
    rmSync(temporaryDirectory, {force: true, recursive: true})
  }
}

try {
  execute()
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Unknown npm release failure.')
  process.exitCode = 1
}
