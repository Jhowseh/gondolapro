import { execFile } from 'node:child_process'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { resourcePath } from './resources'

function run(command: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    execFile(command, args, { windowsHide: true }, (error, _stdout, stderr) => {
      if (error) {
        reject(new Error(stderr.trim() || error.message))
      } else {
        resolve()
      }
    })
  })
}

export async function printRaw(printer: string, payload: string): Promise<void> {
  const directory = await mkdtemp(join(tmpdir(), 'gondolapro-'))
  const file = join(directory, 'label.prn')
  try {
    await writeFile(file, Buffer.from(payload, 'latin1'))
    await run('powershell.exe', [
      '-NoProfile',
      '-NonInteractive',
      '-ExecutionPolicy',
      'Bypass',
      '-File',
      resourcePath('raw-print.ps1'),
      '-PrinterName',
      printer,
      '-FilePath',
      file
    ])
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
}
