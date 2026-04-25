import {DEFAULT_WORKING_DIRECTORY} from '@/utils/agent-defaults'

export const normalizeWorkingDirectoryQueryValue = (workingDirectory: string): string => {
  const normalized = workingDirectory.trim()

  return normalized.length > 0 ? normalized : DEFAULT_WORKING_DIRECTORY
}

export const appendWorkingDirectoryQuery = (url: string, workingDirectory: string): string => {
  const value = normalizeWorkingDirectoryQueryValue(workingDirectory)

  return `${url}?${new URLSearchParams({workingDirectory: value}).toString()}`
}
