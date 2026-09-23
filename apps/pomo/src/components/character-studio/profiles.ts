import rigs from './spring-rigs.json'

interface Profile {
  readonly rig: typeof rigs.haru | typeof rigs.luna
  readonly shell: string
}

const PROFILES = {
  haru: {rig: rigs.haru, shell: 'Body_primitive2'},
  luna: {rig: rigs.luna, shell: 'Body_primitive2'},
} satisfies Record<string, Profile>

/** Resolves the existing Haru URL convention, with Luna as the default profile. */
export const getProfile = (modelUrl: string): Profile =>
  modelUrl.includes('haru.vrm') ? PROFILES.haru : PROFILES.luna
