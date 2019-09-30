import fs from 'fs'
import { promisify } from 'util'

export const readFile = promisify(fs.readFile)
export const writeFile = promisify(fs.writeFile)

export async function readJSON<T>(fname: string): Promise<T> {
  const buf = await readFile(fname)

  return JSON.parse(buf.toString())
}
