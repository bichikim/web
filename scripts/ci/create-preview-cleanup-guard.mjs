/**
 * Checks PR state before each destructive preview cleanup request.
 *
 * @param {object} [options]
 * @param {string} [options.repository] Owner and repository name, defaulting to GITHUB_REPOSITORY.
 * @param {string} [options.pullRequestNumber] PR number, defaulting to PULL_REQUEST_NUMBER.
 * @param {string} [options.closedAt] Closing event timestamp, defaulting to PULL_REQUEST_CLOSED_AT.
 * @param {string} [options.token] GitHub read token, defaulting to GH_TOKEN.
 * @param {string} [options.sharedHeadRef]
 *   For branch-scoped resources, also check for open PRs that use this head branch.
 * @param {typeof fetch} [options.fetchImplementation] Defaults to global fetch.
 * @param {(message: string) => void} [options.write] Defaults to console.log.
 */
export const createPreviewCleanupGuard = ({
  closedAt = process.env.PULL_REQUEST_CLOSED_AT ?? '',
  fetchImplementation = fetch,
  pullRequestNumber = process.env.PULL_REQUEST_NUMBER ?? '',
  repository = process.env.GITHUB_REPOSITORY ?? '',
  sharedHeadRef = '',
  token = process.env.GH_TOKEN ?? '',
  write = console.log,
} = {}) => {
  const readPullRequests = async (suffix) => {
    const response = await fetchImplementation(
      new URL(`https://api.github.com/repos/${repository}/pulls${suffix}`),
      {
        headers: {
          Accept: 'application/vnd.github+json',
          Authorization: `Bearer ${token}`,
          'Cache-Control': 'no-cache',
        },
      },
    )

    if (!response.ok) {
      throw new Error(`GitHub PR status lookup failed with status ${response.status}.`)
    }

    return response.json()
  }

  return async () => {
    if (
      !/^[\w.-]+\/[\w.-]+$/u.test(repository) ||
      !/^[1-9]\d*$/u.test(pullRequestNumber) ||
      !closedAt ||
      !token
    ) {
      throw new TypeError(
        'PR preview cleanup requires a repository, PR number, closing timestamp, and GitHub token.',
      )
    }

    if (sharedHeadRef) {
      const [owner] = repository.split('/')
      const query = new URLSearchParams([
        ['head', `${owner}:${sharedHeadRef}`],
        ['per_page', '1'],
        ['state', 'open'],
      ])
      const openPullRequests = await readPullRequests(`?${query}`)

      if (!Array.isArray(openPullRequests)) {
        throw new TypeError('GitHub open PR lookup returned an invalid response.')
      }

      if (openPullRequests.length > 0) {
        write('Skipping branch cleanup because an open PR still uses the source branch.')
        return false
      }
    }

    const pullRequest = await readPullRequests(`/${pullRequestNumber}`)

    if (pullRequest?.state === 'open') {
      write(`Skipping cleanup because PR #${pullRequestNumber} is open again.`)
      return false
    }

    if (pullRequest?.state !== 'closed' || typeof pullRequest.closed_at !== 'string') {
      throw new TypeError('GitHub PR status lookup returned an invalid response.')
    }

    if (pullRequest.closed_at !== closedAt) {
      write(`Skipping cleanup because PR #${pullRequestNumber} has a newer closing event.`)
      return false
    }

    return true
  }
}
