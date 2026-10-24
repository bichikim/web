export const compareSemanticVersionPreReleaseIdentifiers = (left: string, right: string): number =>
  left.localeCompare(right)
