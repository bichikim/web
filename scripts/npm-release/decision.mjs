const SEMVER_PATTERN = new RegExp(
  '^(?<major>0|[1-9]\\d*)\\.(?<minor>0|[1-9]\\d*)\\.(?<patch>0|[1-9]\\d*)' +
    '(?:-(?<prerelease>[0-9A-Za-z-]+(?:\\.[0-9A-Za-z-]+)*))?$',
  'u',
)
const NUMERIC_IDENTIFIER_PATTERN = /^\d+$/u
const NPM_TAG_PATTERN = /^[a-z][a-z0-9-]*$/u

const parseVersion = (version) => {
  const match = SEMVER_PATTERN.exec(version)

  if (match?.groups === undefined) {
    return null
  }

  const prerelease = match.groups.prerelease?.split('.') ?? []
  const hasInvalidNumericIdentifier = prerelease.some(
    (identifier) =>
      NUMERIC_IDENTIFIER_PATTERN.test(identifier) &&
      identifier.length > 1 &&
      identifier.startsWith('0'),
  )

  if (hasInvalidNumericIdentifier) {
    return null
  }

  return {
    major: Number.parseInt(match.groups.major, 10),
    minor: Number.parseInt(match.groups.minor, 10),
    patch: Number.parseInt(match.groups.patch, 10),
    prerelease,
  }
}

const compareIdentifiers = (left, right) => {
  const leftNumeric = NUMERIC_IDENTIFIER_PATTERN.test(left)
  const rightNumeric = NUMERIC_IDENTIFIER_PATTERN.test(right)

  if (leftNumeric && rightNumeric) {
    return Number.parseInt(left, 10) - Number.parseInt(right, 10)
  }

  if (leftNumeric !== rightNumeric) {
    return leftNumeric ? -1 : 1
  }

  if (left === right) {
    return 0
  }

  return left < right ? -1 : 1
}

const comparePrereleases = (left, right) => {
  if (left.length === 0 || right.length === 0) {
    return left.length === right.length ? 0 : left.length === 0 ? 1 : -1
  }

  const length = Math.max(left.length, right.length)

  for (let index = 0; index < length; index += 1) {
    const leftIdentifier = left[index]
    const rightIdentifier = right[index]

    if (leftIdentifier === undefined || rightIdentifier === undefined) {
      return leftIdentifier === undefined ? -1 : 1
    }

    const comparison = compareIdentifiers(leftIdentifier, rightIdentifier)

    if (comparison !== 0) {
      return comparison
    }
  }

  return 0
}

const compareVersions = (left, right) =>
  left.major - right.major ||
  left.minor - right.minor ||
  left.patch - right.patch ||
  comparePrereleases(left.prerelease, right.prerelease)

const resolveBump = (published, local) => {
  if (local.major > published.major) {
    return 'major'
  }

  if (local.minor > published.minor) {
    return 'minor'
  }

  if (local.patch > published.patch) {
    return 'patch'
  }

  return 'prerelease'
}

const resolveNpmTag = (version) => {
  const [firstIdentifier] = version.prerelease

  if (firstIdentifier === undefined) {
    return 'latest'
  }

  const candidate = firstIdentifier.toLowerCase()
  const canUseCandidate =
    NPM_TAG_PATTERN.test(candidate) &&
    candidate !== 'latest' &&
    candidate !== 'x' &&
    !candidate.startsWith('v')

  return canUseCandidate ? candidate : 'prerelease'
}

export const findHighestVersion = (versions) => {
  const parsedVersions = versions.map((version) => ({parsed: parseVersion(version), version}))
  const invalidVersion = parsedVersions.find((entry) => entry.parsed === null)

  if (invalidVersion !== undefined) {
    throw new Error(`npm returned an unsupported version: ${invalidVersion.version}`)
  }

  return parsedVersions.reduce((highest, entry) =>
    highest === null || compareVersions(entry.parsed, highest.parsed) > 0 ? entry : highest,
  ).version
}

/** Determines whether one package version is eligible for automatic npm publication. */
export const decideRelease = ({localVersion, publishedVersion, sourceChanged}) => {
  if (publishedVersion === null) {
    return {
      code: 'FIRST_PUBLISH_REQUIRED',
      message: 'The package must be published manually once before automation can manage it.',
      status: 'skip',
    }
  }

  const local = parseVersion(localVersion)
  const published = parseVersion(publishedVersion)

  if (local === null || published === null) {
    return {
      code: 'INVALID_VERSION',
      message: 'Only stable or prerelease major.minor.patch SemVer versions are supported.',
      status: 'error',
    }
  }

  const comparison = compareVersions(local, published)

  if (comparison === 0) {
    return {
      code: 'VERSION_UNCHANGED',
      message: 'The repository and npm versions are identical.',
      status: 'skip',
    }
  }

  if (comparison < 0) {
    return {
      code: 'VERSION_BEHIND_NPM',
      message: 'The repository version is older than the highest npm version.',
      status: 'error',
    }
  }

  const bump = resolveBump(published, local)

  if (bump !== 'patch' && bump !== 'prerelease' && !sourceChanged) {
    return {
      bump,
      code: 'SOURCE_CHANGE_REQUIRED',
      message: `${bump} releases require a change under the package source directory.`,
      status: 'error',
    }
  }

  return {
    bump,
    code: 'RELEASE_READY',
    message: `The higher ${bump} version is ready to publish.`,
    npmTag: resolveNpmTag(local),
    status: 'publish',
  }
}
