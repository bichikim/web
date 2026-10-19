module.exports = {
  hooks: {
    readPackage(package_) {
      if (package_.name === '@modelcontextprotocol/ext-apps' && package_.version === '1.7.5') {
        // Code Viewer uses the framework-independent SDK, without its React adapter.
        const excluded = new Set(['react', 'react-dom'])
        return {
          ...package_,
          peerDependencies: Object.fromEntries(
            Object.entries(package_.peerDependencies ?? {}).filter(([name]) => !excluded.has(name)),
          ),
          peerDependenciesMeta: Object.fromEntries(
            Object.entries(package_.peerDependenciesMeta ?? {}).filter(
              ([name]) => !excluded.has(name),
            ),
          ),
        }
      }
      return package_
    },
  },
}
