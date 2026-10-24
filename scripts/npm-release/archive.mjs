const DEPENDENCY_SECTIONS = [
  'dependencies',
  'devDependencies',
  'optionalDependencies',
  'peerDependencies',
]
const NON_PUBLISHABLE_PROTOCOLS = ['catalog:', 'workspace:']

export const assertPublishableDependencies = (manifest) => {
  const dependencies = DEPENDENCY_SECTIONS.flatMap((sectionName) => {
    const section = manifest[sectionName]
    return section !== null && typeof section === 'object' && !Array.isArray(section)
      ? Object.entries(section)
      : []
  })
  const invalidDependencies = dependencies.filter(
    ([, version]) =>
      typeof version === 'string' &&
      NON_PUBLISHABLE_PROTOCOLS.some((protocol) => version.startsWith(protocol)),
  )

  if (invalidDependencies.length > 0) {
    const details = invalidDependencies.map(([name, version]) => `${name}@${version}`).join(', ')
    throw new TypeError(`Archive contains non-publishable dependencies: ${details}.`)
  }
}
