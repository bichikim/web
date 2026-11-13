import {execFile} from 'node:child_process'
import {promisify} from 'node:util'
import {basename} from 'node:path'
import {statfs} from 'node:fs/promises'
import {tmpdir} from 'node:os'
const execute = promisify(execFile)

/** Samples only the preview's process family; unrelated process names and arguments are not retained. */
export const readResources = async (pid: number) => {
  const {stdout} = await execute('ps', ['-A', '-o', 'pid=,ppid=,%cpu=,rss=,comm='], {
    env: {...process.env, LC_ALL: 'C'},
  })
  const rows = stdout.split('\n').flatMap((line) => {
    const fields =
      /^\s*(?<pid>\d+)\s+(?<parent>\d+)\s+(?<cpu>[\d.]+)\s+(?<rss>\d+)\s+(?<name>.+)$/u.exec(
        line,
      )?.groups
    return fields === undefined
      ? []
      : [
          {
            cpu: Number(fields.cpu),
            name: basename(fields.name!),
            parent: Number(fields.parent),
            pid: Number(fields.pid),
            rss: Number(fields.rss),
          },
        ]
  })
  const family = new Set([pid])
  let size = 0
  while (size !== family.size) {
    ;({size} = family)
    rows.filter((row) => family.has(row.parent)).forEach((row) => family.add(row.pid))
  }
  const KIB_PER_MIB = 1024
  const owned = rows.filter((row) => family.has(row.pid))
  const disk = await statfs(tmpdir())
  return {
    cpu: owned.reduce((sum, row) => sum + row.cpu, 0),
    diskAvailableBytes: disk.bavail * disk.bsize,
    processes: owned,
    rssMiB: owned.reduce((sum, row) => sum + row.rss, 0) / KIB_PER_MIB,
  }
}
