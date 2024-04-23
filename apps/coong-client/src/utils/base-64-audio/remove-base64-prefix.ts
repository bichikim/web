export const removeBase64Prefix = (base64Url: string) => {
  return base64Url.slice(base64Url.indexOf(',') + 1)
}
