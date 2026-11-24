import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process'
import { resourcePath } from './resources'

const JOB_TIMEOUT_MS = 60_000

const IDLE_TIMEOUT_MS = 5 * 60_000

interface Job {
  resolve: () => void
  reject: (error: Error) => void
  timer: NodeJS.Timeout
}

interface Worker {
  process: ChildProcessWithoutNullStreams
  jobs: Job[]
  stdout: string
  stderr: string
  idleTimer?: NodeJS.Timeout
}

let current: Worker | null = null

function detach(worker: Worker): void {
  if (current === worker) {
    current = null
  }
  clearTimeout(worker.idleTimer)
}

function fail(worker: Worker, error: Error): void {
  detach(worker)
  for (const job of worker.jobs.splice(0)) {
    clearTimeout(job.timer)
    job.reject(error)
  }
  if (worker.process.exitCode === null) {
    worker.process.kill()
  }
}

function scheduleIdle(worker: Worker): void {
  clearTimeout(worker.idleTimer)
  if (worker.jobs.length > 0) return
  worker.idleTimer = setTimeout(() => {
    detach(worker)
    worker.process.stdin.end()
  }, IDLE_TIMEOUT_MS)
}

function handleLine(worker: Worker, line: string): void {
  if (line !== 'OK' && !line.startsWith('ERR ')) return
  const job = worker.jobs.shift()
  if (!job) return
  clearTimeout(job.timer)
  if (line === 'OK') {
    job.resolve()
  } else {
    job.reject(new Error(Buffer.from(line.slice(4), 'base64').toString('utf8')))
  }
  scheduleIdle(worker)
}

function startWorker(): Worker {
  const child = spawn(
    'powershell.exe',
    ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', resourcePath('raw-print.ps1')],
    { windowsHide: true }
  )
  const worker: Worker = { process: child, jobs: [], stdout: '', stderr: '' }
  child.stdout.setEncoding('utf8')
  child.stderr.setEncoding('utf8')
  child.stdout.on('data', (chunk: string) => {
    worker.stdout += chunk
    let index: number
    while ((index = worker.stdout.indexOf('\n')) >= 0) {
      const line = worker.stdout.slice(0, index).trim()
      worker.stdout = worker.stdout.slice(index + 1)
      handleLine(worker, line)
    }
  })
  child.stderr.on('data', (chunk: string) => {
    worker.stderr += chunk
  })
  child.stdin.on('error', () => undefined)
  child.on('error', (error) => fail(worker, error))
  child.on('exit', (code) => {
    const detail = worker.stderr.trim()
    fail(worker, new Error(detail || `O PowerShell de impressão terminou inesperadamente (código ${code}).`))
  })
  return worker
}

export function printRaw(printer: string, payload: string): Promise<void> {
  const worker = current ?? (current = startWorker())
  clearTimeout(worker.idleTimer)
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      fail(worker, new Error('A impressora não respondeu a tempo.'))
    }, JOB_TIMEOUT_MS)
    worker.jobs.push({ resolve, reject, timer })
    const line = `${Buffer.from(printer, 'utf8').toString('base64')} ${Buffer.from(payload, 'latin1').toString('base64')}\n`
    worker.process.stdin.write(line)
  })
}

export function stopRawPrinter(): void {
  if (current) {
    fail(current, new Error('O aplicativo está sendo fechado.'))
  }
}
