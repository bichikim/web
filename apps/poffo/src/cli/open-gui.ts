import {spawn} from 'node:child_process'
import type {HostConnection} from '../backend/node/start-node-host'

export const openGui = (connection: HostConnection, workspace: string): void => {
  const application = process.env.POFFO_DESKTOP_APP
  if (application !== undefined) {
    const child = spawn(application, ['--workspace', workspace], {detached: true, stdio: 'ignore'})
    child.on('error', () => process.stderr.write('Poffo 창을 열지 못했습니다.\n'))
    child.unref()
    return
  }
  const command =
    process.platform === 'darwin'
      ? 'open'
      : process.platform === 'win32'
        ? 'explorer.exe'
        : 'xdg-open'
  const child = spawn(command, [`${connection.url}/editor#poffo-token=${connection.token}`], {
    stdio: 'ignore',
  })
  child.on('error', () =>
    process.stderr.write('GUI를 열지 못했습니다. poffo start --gui로 다시 연결하세요.\n'),
  )
  child.unref()
}
