/* eslint-disable id-length -- Claude Mods validates the literal $ API parameter. */
/** Calls the authenticated local viewer bridge and translates its error result. */
export async function requestPane($, connection, name, args) {
  if (connection === undefined) {
    throw new Error('프로젝트 연결이 아직 준비되지 않았습니다.')
  }
  const response = await $.http.fetch(`${connection.origin}/tool`, {
    body: JSON.stringify({arguments: {...args, session: connection.session}, name}),
    headers: {Authorization: `Bearer ${connection.token}`, 'Content-Type': 'application/json'},
    method: 'POST',
  })
  if (!response.ok) {
    throw new Error(`프로젝트 요청 실패 (${response.status})`)
  }
  const result = JSON.parse(response.text)
  if (result.isError) {
    const code = result.structuredContent?.code
    throw new Error(
      code === 'clipboard-unavailable'
        ? '클립보드에 접근하지 못했습니다.'
        : code === 'write-conflict'
          ? '디스크 파일이 바뀌었습니다. 초안을 유지했습니다.'
          : (code ?? '파일 요청 실패'),
    )
  }
  return result.structuredContent
}
