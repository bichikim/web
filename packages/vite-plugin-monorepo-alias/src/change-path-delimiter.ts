export const changePathDelimiter = (
  path: string,
  delimiter: string,
  targetDelimiter: string = '/',
) => {
  return path.split(delimiter).join(targetDelimiter)
}
