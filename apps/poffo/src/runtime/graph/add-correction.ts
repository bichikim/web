import type {RuntimeControls} from '../use-runtime-controls'
export const addCorrection = (controls: Pick<RuntimeControls, 'profile' | 'updateProfile'>) => {
  const profile = controls.profile()
  if (profile === undefined) {
    return
  }
  const id = `draft:${crypto.randomUUID()}`
  controls.updateProfile({
    ...profile,
    drafts: [...(profile.drafts ?? []), id],
    mappings: [
      ...profile.mappings,
      {
        enabled: true,
        input: 'mouthOpen',
        inputConnected: false,
        inputMaximum: 1,
        inputMinimum: 0,
        outputConnected: false,
        outputMaximum: 1,
        outputMinimum: 0,
        parameterId: id,
        smoothing: 0,
      },
    ],
  })
}
