import {spawn} from 'node:child_process'
import {once} from 'node:events'
import {resolve} from 'node:path'
import {Client} from '@modelcontextprotocol/sdk/client/index.js'
import {StdioClientTransport} from '@modelcontextprotocol/sdk/client/stdio.js'
import {describe, expect, it} from 'vitest'

const entry = resolve('packages/knowledge/bin/know.mjs')

describe('serveKnowledgeStdio process', () => {
  it('should negotiate and list tools over actual stdio without logging to stdout', async () => {
    const transport = new StdioClientTransport({
      args: [entry, 'mcp', '--repo', '/nonexistent-knowledge-test'],
      command: process.execPath,
      stderr: 'pipe',
    })
    const client = new Client({name: 'stdio-test', version: '1'})
    const errors: string[] = []
    transport.stderr?.on('data', (chunk) => errors.push(String(chunk)))
    try {
      await client.connect(transport)
      expect((await client.listTools()).tools).toHaveLength(3)
      const result = await client.callTool({
        arguments: {logicalId: 'missing'},
        name: 'knowledge_get',
      })
      expect(result.isError).toBe(true)
      expect(JSON.stringify(result)).toContain('repository-unavailable')
      expect(errors).toEqual([])
      const pid = transport.pid
      if (pid === null) {
        throw new Error('Missing server process')
      }
      const closed = new Promise<void>((resolveClosed) => {
        client.onclose = resolveClosed
      })
      process.kill(pid, 'SIGTERM')
      await closed
    } finally {
      await client.close()
    }
  })
  it('should exit cleanly on stdin EOF without printing non-protocol output', async () => {
    const child = spawn(process.execPath, [entry, 'mcp'], {stdio: ['pipe', 'pipe', 'pipe']})
    let stdout = ''
    let stderr = ''
    child.stdout.on('data', (chunk) => {
      stdout += String(chunk)
    })
    child.stderr.on('data', (chunk) => {
      stderr += String(chunk)
    })
    const closed = once(child, 'close')
    child.stdin.end()
    try {
      expect(await closed).toEqual([0, null])
      expect(stdout).toBe('')
      expect(stderr).toBe('')
    } finally {
      if (child.exitCode === null) {
        child.kill('SIGTERM')
      }
    }
  })
})
