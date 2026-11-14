import {execFile} from 'node:child_process'
import {promisify} from 'node:util'
import {describe, expect, it} from 'vitest'
import {createKnowledgeGetCommand} from '../create-knowledge-get-command'

const execute = promisify(execFile)

describe('createKnowledgeGetCommand', () => {
  it.each([
    {docId: "docs/It's a %23# guide.md"},
    {docId: '--doc.md', unitId: "--it's # %23 $value `literal` $(false)"},
  ])(
    'should roundtrip literal identity and repository values through a POSIX shell %j',
    async (identity) => {
      const repositoryPath = "/repo/It's a space $value $(false) `literal`"
      const entryPath = "/package/It's a space $value $(false)/know.mjs"
      const command = createKnowledgeGetCommand({
        entryPath,
        executable: 'capture',
        identity,
        repositoryPath,
      })
      const {stdout} = await execute('sh', ['-c', `capture() { printf '%s\\0' "$@"; }\n${command}`])
      expect(stdout.split('\0').slice(0, -1)).toEqual([
        entryPath,
        'get',
        `--doc-id=${identity.docId}`,
        ...(identity.unitId === undefined ? [] : [`--unit-id=${identity.unitId}`]),
        `--repo=${repositoryPath}`,
      ])
    },
  )
})
