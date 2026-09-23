declare const requestMetadata: () => Promise<object>

/** Metadata is optional, but the failure modes covered by this contract are unspecified. */
export const loadOptionalMetadata = async (): Promise<object | undefined> => {
  try {
    return await requestMetadata()
  } catch (error: unknown) {
    if (error instanceof Error && error.name === 'MetadataUnavailable') {
      return undefined
    }
    throw error
  }
}
