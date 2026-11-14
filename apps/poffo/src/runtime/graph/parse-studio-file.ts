import type {RuntimeProfile} from '../../tracking/types'
import {
  applyWorkspaceCollapse,
  parseWorkspaceLayout,
  type WorkspaceLayout,
} from './workspace-layout'
export interface StudioFile {
  readonly format: 'puppet-studio'
  readonly version: 1
  readonly profile: RuntimeProfile
  readonly layout: WorkspaceLayout
}
interface StudioImport {
  readonly profile: RuntimeProfile
  readonly layout?: WorkspaceLayout
}
interface ParseStudioFileOptions {
  readonly value: unknown
  readonly currentProfile: RuntimeProfile
  readonly parseProfile: (value: unknown) => RuntimeProfile | undefined
}
export const parseStudioFile = (options: ParseStudioFileOptions): StudioImport | undefined => {
  const {value} = options
  if (typeof value !== 'object' || value === null) {
    return undefined
  }
  if ('format' in value && value.format === 'puppet-studio') {
    if (
      !('version' in value) ||
      value.version !== 1 ||
      !('profile' in value) ||
      !('layout' in value)
    ) {
      return undefined
    }
    const profile = options.parseProfile(value.profile)
    const layout = parseWorkspaceLayout(value.layout, options.currentProfile.signature)
    if (profile === undefined || layout === undefined) {
      return undefined
    }
    const combined = options.parseProfile(applyWorkspaceCollapse(profile, layout))
    return combined === undefined ? undefined : {layout, profile: combined}
  }
  const layout = parseWorkspaceLayout(value, options.currentProfile.signature)
  if (layout !== undefined) {
    const profile = options.parseProfile(applyWorkspaceCollapse(options.currentProfile, layout))
    return profile === undefined ? undefined : {layout, profile}
  }
  const profile = options.parseProfile(value)
  return profile === undefined ? undefined : {profile}
}
