import shellescape from 'shell-escape'
import { MappingOutput } from './types'

interface FormatOptions {
  format: TargetFormat
}

export enum TargetFormat {
  Docker = 'docker',
  Dotenv = 'dotenv',
  Exports = 'exports',
  JSON = 'json'
}

/**
 * Given an object determines how to cleanly represent its value when serialized to a command line
 * @param {number|string|object} value
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function serializeValue(value: any): string {
  if (typeof value === 'number') {
    return value.toString()
  }

  if (typeof value === 'string') {
    return shellescape([value])
  }

  return shellescape([JSON.stringify(value)])
}

export function formatOutput(result: MappingOutput, opts: FormatOptions): string {
  const format = opts.format

  if (format === TargetFormat.JSON) {
    return JSON.stringify(result)
  }

  if (format === TargetFormat.Docker) {
    const lines = Object.keys(result).map((k): string => `ENV ${k}=${serializeValue(result[k])}`)

    return lines.join('\n') + '\n'
  }

  if (format === TargetFormat.Dotenv) {
    const lines = Object.keys(result).map((k): string => `${k}=${serializeValue(result[k])}`)

    return lines.join('\n') + '\n'
  }

  if (format === TargetFormat.Exports) {
    const lines = Object.keys(result).map((k): string => `export ${k}=${serializeValue(result[k])}`)

    return lines.join('\n') + '\n'
  }

  throw new Error(`unknown format '${format}'`)
}
