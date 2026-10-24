import type {PuppetDocument} from '../../player/document'

/** Sets a part's user data (Cubism's userdata3); empty text removes it. */
export const setPartUserData = (
  document: PuppetDocument,
  partId: string,
  userData: string,
): PuppetDocument => ({
  ...document,
  parts: document.parts.map((part) => {
    if (part.id !== partId) {
      return part
    }
    const {userData: _previous, ...rest} = part
    return userData.length === 0 ? rest : {...rest, userData}
  }),
})
