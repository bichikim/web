import assert from 'node:assert/strict'
import {readFile, writeFile} from 'node:fs/promises'
import {createHash} from 'node:crypto'
import {fileURLToPath} from 'node:url'
import {chromium} from 'playwright'
import {build, preview} from 'vite'

const configFile = fileURLToPath(new URL('../vite.config.ts', import.meta.url))
const trainingPath = fileURLToPath(
  new URL('../public/datasets/banking77/train.jsonl', import.meta.url),
)
const evaluationPath = fileURLToPath(
  new URL('../public/datasets/banking77/evaluation.jsonl', import.meta.url),
)
const port = 3402
const deadline = 240_000
const total = 30
const availableTraining = 90
const started = Date.now()
const trainingCount = Number(process.env.LAYA_EVALUATION_TRAINING_COUNT ?? availableTraining)
assert.ok(
  Number.isInteger(trainingCount) && trainingCount >= 1 && trainingCount <= availableTraining,
)
const percentageScale = 100
const modelUrl = process.env.LAYA_EVALUATION_MODEL_URL ?? '/models/laya-multilingual/'
assert.ok(['/models/laya/', '/models/laya-multilingual/'].includes(modelUrl))
const reportPath = process.env.LAYA_EVALUATION_REPORT
let server
let browser
try {
  await build({configFile})
  server = await preview({configFile, preview: {port}})
  browser = await chromium.launch({headless: true})
  const page = await browser.newPage({viewport: {height: 1000, width: 1280}})
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto(`http://127.0.0.1:${port}/`)
  await page.getByText(modelUrl === '/models/laya/' ? '영문' : '다국어', {exact: true}).click()
  const manifest = await (
    await page.request.get(`http://127.0.0.1:${port}${modelUrl}manifest.json`)
  ).json()
  const trainingText = (await readFile(trainingPath, 'utf8'))
    .trim()
    .split('\n')
    .slice(0, trainingCount)
    .join('\n')
  const trainingFile = {
    buffer: Buffer.from(trainingText),
    mimeType: 'application/x-ndjson',
    name: 'training.jsonl',
  }
  await page.getByLabel('학습 JSONL 파일 가져오기').setInputFiles(trainingFile)
  await page.getByRole('button', {exact: true, name: `예제 ${trainingCount} 삭제`}).waitFor()
  assert.equal(
    await page.getByRole('list', {name: '학습 예제'}).getByRole('listitem').count(),
    trainingCount,
  )
  await page.getByRole('button', {exact: true, name: '평가용 30개 불러오기'}).click()
  await page
    .getByLabel('평가 예제 수')
    .filter({hasText: `${total}개`})
    .waitFor()
  assert.equal(
    await page.getByRole('list', {name: '학습 예제'}).getByRole('listitem').count(),
    trainingCount,
  )
  const evaluation = (await readFile(evaluationPath, 'utf8'))
    .trim()
    .split('\n')
    .map((line) => JSON.parse(line))
  await page.getByLabel('분류 지시문', {exact: true}).fill(evaluation[0].question.instructions)
  await page.getByLabel('선택지', {exact: false}).fill(evaluation[0].question.criteria.join('\n'))
  await page.getByLabel('분류할 문장', {exact: true}).fill(evaluation[1].state)
  await page.getByLabel('반복 횟수').fill('1')
  await page.getByLabel('학습률', {exact: true}).fill('0.001')
  console.log('Loading actual WASM model')
  await page.getByRole('button', {exact: true, name: '모델 불러오기'}).click()
  await Promise.race([
    page.getByRole('status').filter({hasText: '모델 준비됨'}).waitFor({timeout: deadline}),
    page
      .getByRole('alert')
      .waitFor({timeout: deadline})
      .then(async () => {
        throw new Error(await page.getByRole('alert').innerText())
      }),
  ])
  await page.getByLabel('평가 JSONL 파일 가져오기').setInputFiles(trainingFile)
  await page
    .getByLabel('평가 예제 수')
    .filter({hasText: `${trainingCount}개`})
    .waitFor()
  await page.getByRole('button', {exact: true, name: '학습하고 결과 비교'}).click()
  await page.getByRole('alert').filter({hasText: '학습 데이터'}).waitFor()
  await page.getByText('누적 0 단계', {exact: true}).waitFor()
  await page.getByRole('button', {exact: true, name: '닫기'}).click()
  await page.getByRole('button', {exact: true, name: '평가용 30개 불러오기'}).click()
  await page
    .getByLabel('평가 예제 수')
    .filter({hasText: `${total}개`})
    .waitFor()
  console.log(`Evaluating ${total} -> training ${trainingCount} -> evaluating same ${total}`)
  await page.getByRole('button', {exact: true, name: '학습하고 결과 비교'}).click()
  const after = page.getByRole('status', {exact: true, name: '학습 후 정확도'})
  try {
    await page.waitForFunction(
      () => Number(document.querySelector('[aria-label="학습 진행률"]')?.getAttribute('value')) > 0,
      undefined,
      {timeout: deadline},
    )
    console.log('Baseline evaluation complete; training started')
    await page.waitForFunction(
      (count) =>
        Number(document.querySelector('[aria-label="학습 진행률"]')?.getAttribute('value')) ===
        count,
      trainingCount,
      {timeout: deadline},
    )
    console.log('Training complete; final evaluation pending')
    await Promise.race([
      after.waitFor({timeout: deadline}),
      page
        .getByRole('alert')
        .waitFor({timeout: deadline})
        .then(async () => {
          throw new Error(await page.getByRole('alert').innerText())
        }),
    ])
  } catch (cause) {
    console.log(await page.locator('body').innerText())
    await page.screenshot({fullPage: true, path: '/tmp/laya-evaluation-failed.png'})
    throw cause
  }
  await page.getByText(`누적 ${trainingCount} 단계`, {exact: true}).waitFor()
  await page.getByText(`문장별 결과 (${total}개)`, {exact: true}).click()
  const rows = page.getByRole('table', {name: '평가 문장별 결과'}).getByRole('row')
  assert.equal(await rows.count(), total + 1)
  const results = await rows.allTextContents()
  assert.ok(results.some((row) => row.includes(evaluation[1].state)))
  const beforeCells = await rows.locator('td:nth-child(3)').allTextContents()
  const afterCells = await rows.locator('td:nth-child(4)').allTextContents()
  const beforeCorrect = beforeCells.filter((text) => text.endsWith('맞음')).length
  const afterCorrect = afterCells.filter((text) => text.endsWith('맞음')).length
  const summary = (correct) =>
    `${((correct / total) * percentageScale).toFixed(1)}% (${correct}/${total})`
  assert.equal(
    await page.getByRole('status', {exact: true, name: '학습 전 정확도'}).innerText(),
    summary(beforeCorrect),
  )
  assert.equal(await after.innerText(), summary(afterCorrect))
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', {exact: true, name: '다운로드'}).click()
  const checkpoint = JSON.parse(await readFile(await (await downloadPromise).path(), 'utf8'))
  assert.equal(checkpoint.steps, trainingCount)
  await page.screenshot({
    fullPage: true,
    path: reportPath === undefined ? '/tmp/laya-evaluation.png' : `${reportPath}.png`,
  })
  await page.setViewportSize({height: 900, width: 375})
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
  assert.deepEqual(errors, [])
  await page.getByRole('button', {exact: true, name: '평가 비우기'}).click()
  assert.equal(await page.getByRole('status', {exact: true, name: '학습 후 정확도'}).count(), 0)
  const report = {
    afterCorrect,
    beforeCorrect,
    elapsedMs: Date.now() - started,
    epochs: 1,
    evaluationSha256: createHash('sha256')
      .update(await readFile(evaluationPath))
      .digest('hex'),
    learningRate: 0.001,
    mobile: 'passed',
    modelId: manifest.modelId,
    modelUrl,
    overlap: 'rejected',
    rows: results.slice(1),
    total,
    trainingCount,
    trainingSha256: createHash('sha256').update(trainingText).digest('hex'),
    trainingSteps: checkpoint.steps,
  }
  if (reportPath !== undefined) {
    await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`)
  }
  console.log(JSON.stringify(report))
} finally {
  await browser?.close()
  await new Promise((resolve) => {
    if (server === undefined) {
      resolve()
    } else {
      server.httpServer.close(resolve)
    }
  })
}
