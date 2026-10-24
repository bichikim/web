export const ViewportMetadata = () => {
  const content =
    import.meta.env.VITE_POMO_IS_APPS_IN_TOSS === 'true'
      ? 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover'
      : 'width=device-width, initial-scale=1, viewport-fit=cover'

  return <meta name="viewport" content={content} />
}
