interface Profile {
  readonly id: string
}

interface ProfileError extends Error {
  readonly status: number
}

declare const requestProfile: () => Promise<Profile>
const NOT_FOUND_STATUS = 404

/** Returns undefined when the profile is not found and preserves every other failure. */
export const findProfile = async (): Promise<Profile | undefined> => {
  try {
    return await requestProfile()
  } catch (error: unknown) {
    if (
      error instanceof Error &&
      'status' in error &&
      (error as ProfileError).status === NOT_FOUND_STATUS
    ) {
      return undefined
    }
    throw error
  }
}
