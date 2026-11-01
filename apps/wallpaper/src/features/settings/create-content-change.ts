import type {WallpaperContent} from '@winter-love/wallpaper/settings/model'

interface CreateContentChangeOptions {
  readonly before: WallpaperContent
  readonly after: WallpaperContent
}

/** Applies only changed fields when the content mode remains the same. */
export const createContentChange = (options: CreateContentChangeOptions) => {
  const {before, after} = options
  if (before.mode === 'puppet' && after.mode === 'puppet') {
    const patch = {
      ...(before.assetId === after.assetId ? {} : {assetId: after.assetId}),
      ...(before.placement === after.placement ? {} : {placement: after.placement}),
      ...(before.tracking === after.tracking ? {} : {tracking: after.tracking}),
      ...(before.trackingOptions === after.trackingOptions
        ? {}
        : {trackingOptions: after.trackingOptions}),
      ...(before.trackingBindings === after.trackingBindings
        ? {}
        : {trackingBindings: after.trackingBindings}),
    }
    return (current: WallpaperContent): WallpaperContent =>
      current.mode === 'puppet' ? {...current, ...patch} : after
  }
  if (before.mode !== 'album' || after.mode !== 'album') {
    return () => after
  }
  const patch = {
    ...(before.fit === after.fit ? {} : {fit: after.fit}),
    ...(before.order === after.order ? {} : {order: after.order}),
    ...(before.photoSeconds === after.photoSeconds ? {} : {photoSeconds: after.photoSeconds}),
    ...(before.transition === after.transition ? {} : {transition: after.transition}),
    ...(before.videoMode === after.videoMode ? {} : {videoMode: after.videoMode}),
    ...(before.mediaIds.length !== after.mediaIds.length ||
    before.mediaIds.some((id, index) => id !== after.mediaIds[index])
      ? {mediaIds: after.mediaIds}
      : {}),
  }
  return (current: WallpaperContent): WallpaperContent =>
    current.mode === 'album' ? {...current, ...patch} : after
}
