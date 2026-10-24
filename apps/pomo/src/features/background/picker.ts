/** Opens the supported native album picker, returning copied media files. */
export const pickNativeMedia = async (): Promise<readonly File[]> => {
  const {Device} = await import('@apps-in-toss/web-framework')
  if (!Device.getAlbumItems.isSupported()) {
    throw new Error('UNSUPPORTED_APP_VERSION')
  }
  const items = await Device.getAlbumItems({
    base64: true,
    maxCount: 10,
    maxWidth: 2560,
    types: ['PHOTO', 'VIDEO'],
  })
  return Promise.all(
    items.map(async (item) => {
      const uri =
        item.type === 'PHOTO' && !item.dataUri.startsWith('data:')
          ? `data:image/jpeg;base64,${item.dataUri}`
          : item.dataUri
      const response = await fetch(uri)
      if (!response.ok) {
        throw new Error('Unable to read selected album media.')
      }
      const blob = await response.blob()
      return new File([blob], item.id, {
        type: blob.type || (item.type === 'PHOTO' ? 'image/jpeg' : 'video/mp4'),
      })
    }),
  )
}
