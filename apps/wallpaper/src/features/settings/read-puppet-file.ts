/** Returns a Puppet source accepted by the existing player parser. */
export const readPuppetFile = async (file: File): Promise<string> => {
  const {preparePuppetDocument} = await import('@winter-love/puppet/player')
  const source = await file.text()
  const prepared = await preparePuppetDocument({source})
  if (!prepared.ok) {
    throw new Error('올바른 Poffo 파일을 선택해 주세요.')
  }
  return source
}
