import {mkdtemp, rm, statfs, writeFile} from 'node:fs/promises'
import {cpus, tmpdir} from 'node:os'
import {join, resolve} from 'node:path'
import {fileURLToPath} from 'node:url'
import {utils, write} from 'xlsx'
import {expect} from 'playwright/test'
import {CallToolResultSchema} from '@modelcontextprotocol/sdk/types.js'
import {memoStateSchema} from '../../src/shared/memo-state'
import {type ViewerFixture, withViewer} from '../../src/preview/__tests__/with-viewer'
import {createOfficeLoad} from './create-office-load'
import {createSdkLoad} from './create-sdk-load'
import {readResources} from './read-resources'

const [outputArgument, workspaceArgument, ...selectedCases] = process.argv.slice(2)
if (outputArgument === undefined) {
  throw new Error(
    'Usage: node --import tsx benchmarks/viewer/measure.ts /absolute/report.json [workspace] [condition ...]',
  )
}
const output = resolve(outputArgument)
const workspace = workspaceArgument ?? fileURLToPath(new URL('../../../../', import.meta.url))
const PERCENT = 100
const NANOSECONDS = 1000000
const ROUNDS = 3
const LOAD_DEADLINE_MS = 15000
const LINE_PAIRS = 1997
const GIB = 1073741824
const MINIMUM_FREE_GIB = 10
const DEFAULT_WARMUPS = 4
const MINIMUM_FREE_BYTES = MINIMUM_FREE_GIB * GIB
const assertDiskBudget = async () => {
  const disk = await statfs(tmpdir())
  if (disk.bavail * disk.bsize < MINIMUM_FREE_BYTES) {
    throw new Error('Stopped load trial: less than 10 GiB temporary disk space remains')
  }
}
const items = Array.from({length: 100}, (_, index) => `${index}:${'가\n'.repeat(LINE_PAIRS)}가`)
const cpuTimes = () =>
  cpus().reduce(
    (total, cpu) => ({
      all: total.all + Object.values(cpu.times).reduce((sum, value) => sum + value, 0),
      idle: total.idle + cpu.times.idle,
    }),
    {all: 0, idle: 0},
  )
const cases = [
  {name: 'baseline', office: false, retained: false, sdk: false, warmups: 0},
  {name: 'retained', office: false, retained: true, sdk: false, warmups: 4},
  {name: 'released', office: false, retained: false, sdk: false, warmups: 4},
  {name: 'sdk', office: false, retained: false, sdk: true, warmups: 0},
  {name: 'retained-sdk', office: false, retained: true, sdk: true, warmups: 4},
  {name: 'released-sdk', office: false, retained: false, sdk: true, warmups: 4},
  {name: 'office', office: true, retained: false, sdk: false, warmups: 0},
  {name: 'sdk-office', office: true, retained: false, sdk: true, warmups: 0},
  {name: 'retained-heavy', office: true, retained: true, sdk: true, warmups: 12},
  {name: 'released-heavy', office: true, retained: false, sdk: true, warmups: 12},
]
const selected = cases.filter((condition) =>
  selectedCases.length === 0
    ? condition.warmups <= DEFAULT_WARMUPS
    : selectedCases.includes(condition.name),
)
if (
  selected.length === 0 ||
  selectedCases.some((name) => !cases.some((condition) => condition.name === name))
) {
  throw new Error('Unknown or empty benchmark condition selection')
}
const workbook = write(
  {
    SheetNames: ['Dense'],
    Sheets: {
      Dense: utils.aoa_to_sheet(
        Array.from({length: 1000}, (_, row) =>
          Array.from({length: 100}, (_, column) => `${row}:${column}`),
        ),
      ),
    },
  },
  {bookType: 'xlsx', compression: true, type: 'buffer'},
)
const results: object[] = []
const showMemos = async ({page, app, url}: ViewerFixture) => {
  const received = page.waitForResponse(`${url}initial`)
  await page.goto(url)
  await expect(
    app.getByRole('region', {exact: true, name: '메모'}).getByRole('listitem'),
  ).toHaveCount(items.length)
  const result = CallToolResultSchema.parse(await (await received).json())
  const session = result.structuredContent?.session
  if (typeof session !== 'string') {
    throw new Error('No workspace session was received')
  }
  return session
}
const measure = async (viewer: ViewerFixture) => {
  const cdp = await viewer.page.context().newCDPSession(viewer.page)
  await cdp.send('Performance.enable')
  const cpu = cpuTimes()
  const started = process.hrtime.bigint()
  await showMemos(viewer)
  const loadMs = Number(process.hrtime.bigint() - started) / NANOSECONDS
  const input = viewer.app.getByRole('textbox', {name: '새 메모'})
  const typing = process.hrtime.bigint()
  await input.fill('응답 확인')
  await expect(input).toHaveValue('응답 확인')
  const inputMs = Number(process.hrtime.bigint() - typing) / NANOSECONDS
  const {metrics} = await cdp.send('Performance.getMetrics')
  await cdp.detach()
  const after = cpuTimes()
  return {
    inputMs,
    loadMs,
    metrics: Object.fromEntries(
      metrics
        .filter((item) =>
          [
            'TaskDuration',
            'ScriptDuration',
            'LayoutDuration',
            'RecalcStyleDuration',
            'JSHeapUsedSize',
          ].includes(item.name),
        )
        .map((item) => [item.name, item.value]),
    ),
    systemBusyPercent: PERCENT * (1 - (after.idle - cpu.idle) / (after.all - cpu.all)),
  }
}
const directory = await mkdtemp(join(tmpdir(), 'viewer-load-'))
try {
  const startSdk = await createSdkLoad(directory)
  for (let round = 0; round < ROUNDS; round += 1) {
    const ordered = round === 1 ? selected.toReversed() : selected
    for (const condition of ordered) {
      // oxlint-disable-next-line no-await-in-loop -- Matched trials run sequentially to avoid unintended load contamination.
      await withViewer({workspace}, async (viewer) => {
        await assertDiskBudget()
        viewer.page.setDefaultTimeout(LOAD_DEADLINE_MS)
        await viewer.call('code.save-memos', {patch: {expanded: true, items, visible: true}})
        const retiredStates: unknown[] = []
        for (let warmup = 0; warmup < condition.warmups; warmup += 1) {
          // oxlint-disable-next-line no-await-in-loop -- Stop before another retained workspace can exhaust temporary storage.
          await assertDiskBudget()
          // oxlint-disable-next-line no-await-in-loop -- Each completed mount precedes either release or intentional retention.
          const session = await showMemos(viewer)
          if (!condition.retained) {
            // oxlint-disable-next-line no-await-in-loop
            await viewer.releaseSessions()
          }
          // oxlint-disable-next-line no-await-in-loop -- Probe each completed mount after its release decision.
          const probe = await viewer.call('code.read', {
            path: '__load_probe_missing__.txt',
            session,
          })
          retiredStates.push(probe.structuredContent?.code)
        }
        const resourcesBefore = await readResources(viewer.child.pid!)
        await assertDiskBudget()
        const office = condition.office ? await createOfficeLoad(workbook) : undefined
        let sdk: Awaited<ReturnType<typeof startSdk>> | undefined
        try {
          sdk = condition.sdk ? await startSdk() : undefined
          await office?.start()
          const measured = await measure(viewer)
          const resourcesAfter = await readResources(viewer.child.pid!)
          const sdkResult = await sdk?.result
          await office?.result
          const result = {
            round,
            ...condition,
            ...measured,
            resourcesAfter,
            resourcesBefore,
            retiredStates,
            sdk: sdkResult,
          }
          results.push(result)
          await writeFile(
            output,
            JSON.stringify(
              {
                environment: {
                  architecture: process.arch,
                  cores: cpus().length,
                  platform: process.platform,
                  workspace,
                },
                results,
              },
              null,
              2,
            ),
          )
          console.log(
            JSON.stringify({
              condition: condition.name,
              inputMs: Math.round(measured.inputMs),
              loadMs: Math.round(measured.loadMs),
              round,
              rssMiB: Math.round(resourcesAfter.rssMiB),
              sdkCode: sdkResult?.code,
            }),
          )
          if (sdkResult !== undefined && sdkResult.code !== 0) {
            console.error(
              'SDK assertions failed during controlled load; raw output is retained in the report.',
            )
          }
          if (
            !memoStateSchema.safeParse((await viewer.call('code.memos')).structuredContent).success
          ) {
            throw new Error('Memo state was corrupted under load')
          }
        } finally {
          await office?.close()
          sdk?.close()
          await sdk?.result
        }
      })
    }
  }
} finally {
  await rm(directory, {force: true, recursive: true})
}
