import {PUPPET_EDITOR_TAG_NAME, PuppetEditorElement} from './PuppetEditorElement'

export const definePuppetEditorElement = () => {
  if (customElements.get(PUPPET_EDITOR_TAG_NAME) === undefined) {
    customElements.define(PUPPET_EDITOR_TAG_NAME, PuppetEditorElement)
  }
}
