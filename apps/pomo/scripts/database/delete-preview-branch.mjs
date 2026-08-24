import {pathToFileURL} from 'node:url'

const NEON_API_ORIGIN = 'https://console.neon.tech'

const requireValue = (value, name) => {
  const normalizedValue = value?.trim()

  if (!normalizedValue) {
    throw new TypeError(`${name} is required.`)
  }

  return normalizedValue
}

const requestNeon = async (path, apiKey, options = {}, fetchImplementation = fetch) => {
  const response = await fetchImplementation(new URL(path, NEON_API_ORIGIN), {
    ...options,
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${apiKey}`,
      ...options.headers,
    },
  })

  if (!response.ok) {
    throw new Error(`Neon API request failed with status ${response.status}.`)
  }

  return response
}

/** Deletes one exact Preview branch and treats an absent branch as already cleaned up. */
export const deletePreviewBranch = async (
  {apiKey, branchName, projectId},
  {fetchImplementation = fetch, write = console.log} = {},
) => {
  const normalizedApiKey = requireValue(apiKey, 'NEON_API_KEY')
  const normalizedBranchName = requireValue(branchName, 'NEON_BRANCH_NAME')
  const normalizedProjectId = requireValue(projectId, 'NEON_PROJECT_ID')

  if (!normalizedBranchName.startsWith('preview/')) {
    throw new TypeError('NEON_BRANCH_NAME must start with preview/.')
  }

  const projectPath = `/api/v2/projects/${encodeURIComponent(normalizedProjectId)}`
  const response = await requestNeon(
    `${projectPath}/branches`,
    normalizedApiKey,
    {},
    fetchImplementation,
  )
  const result = await response.json()
  const branches = Array.isArray(result?.branches) ? result.branches : null

  if (!branches) {
    throw new TypeError('Neon branch response is invalid.')
  }

  const matchingBranches = branches.filter((branch) => branch?.name === normalizedBranchName)

  if (matchingBranches.length === 0) {
    write(`Neon Preview branch ${normalizedBranchName} is already absent.`)
    return 'absent'
  }

  if (matchingBranches.length !== 1 || typeof matchingBranches[0].id !== 'string') {
    throw new TypeError(`Neon Preview branch ${normalizedBranchName} is ambiguous.`)
  }

  await requestNeon(
    `${projectPath}/branches/${encodeURIComponent(matchingBranches[0].id)}`,
    normalizedApiKey,
    {method: 'DELETE'},
    fetchImplementation,
  )
  write(`Deleted Neon Preview branch ${normalizedBranchName}.`)

  return 'deleted'
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  deletePreviewBranch({
    apiKey: process.env.NEON_API_KEY,
    branchName: process.env.NEON_BRANCH_NAME,
    projectId: process.env.NEON_PROJECT_ID,
  }).catch((error) => {
    console.error(error instanceof Error ? error.message : 'Unknown Neon cleanup failure.')
    process.exitCode = 1
  })
}
