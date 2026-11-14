import type {RuntimeControls} from '../use-runtime-controls'
export const collapseGraphCards = (controls: RuntimeControls) => {
  const profile = controls.profile()
  if (profile !== undefined) {
    controls.updateProfile({
      ...profile,
      collapsedInputs: ['tracking', 'manual', 'button'],
      groups: profile.groups?.map((group) => ({...group, collapsed: true})),
      mappings: profile.mappings.map((mapping) => ({...mapping, collapsed: true})),
    })
  }
}
