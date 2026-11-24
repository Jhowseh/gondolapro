import { join } from 'node:path'
import { app } from 'electron'

export function resourcePath(name: string): string {
  const base = app.isPackaged ? process.resourcesPath : app.getAppPath()
  return join(base, 'resources', name)
}
