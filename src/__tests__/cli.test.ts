/* eslint-env mocha */
import fs from 'fs'
import { readJSON } from '../util'
import { CLI } from '../cli'
import * as formatter from '../formatter'
import { SecretsMapper } from '../secrets-mapper'
import { MappingInput } from '../types'

const { TargetFormat } = formatter

const OUTPUT_NAME = './test-DELETE.json'

const fnames = {
  nested: './data/nested-secrets.json',
  good: './data/secrets.json',
  good1: './data/secrets-1.json',
  badScheme: './data/bad-scheme.json'
}

let stdoutSpy: jest.SpyInstance
let formatSpy: jest.SpyInstance
let mapStub: jest.SpyInstance

const mappedSecrets = {
  SECRET: 'value',
  JSON_SECRET: {
    nested: 'value'
  }
}

describe('CLI', () => {
  let cli: CLI

  beforeEach(() => {
    if (fs.existsSync(OUTPUT_NAME)) {
      fs.unlinkSync(OUTPUT_NAME)
    }

    const secretsMapper = new SecretsMapper()
    cli = new CLI({ secretsMapper })

    formatSpy = jest.spyOn(formatter, 'formatOutput')
    stdoutSpy = jest.spyOn(process.stdout, 'write')
    mapStub = jest.spyOn(secretsMapper, 'mapAll')
    mapStub.mockResolvedValue(mappedSecrets)
  })

  afterEach(() => {
    jest.resetAllMocks()
    jest.restoreAllMocks()
  })

  describe('with one valid, single-level file', () => {
    const fname = fnames.good

    it('passes all expected keys to the SecretsManager', async () => {
      const argv = [fname]
      await cli.run(argv)

      const expectedOutput = JSON.stringify(mappedSecrets)
      expect(stdoutSpy).toBeCalledWith(expectedOutput)
    })
  })

  describe('-f docker', () => {
    it('outputs in dockerfile format with -f docker', async () => {
      const argv = ['-f', 'docker', fnames.good]

      await cli.run(argv)

      const expectedOutput = 'ENV SECRET=value\nENV JSON_SECRET=\'{"nested":"value"}\'\n'

      expect(formatSpy).toBeCalledWith(mappedSecrets, { format: formatter.TargetFormat.Docker })
      expect(stdoutSpy).toBeCalledWith(expectedOutput)
    })
  })

  describe('-f exports', () => {
    it('outputs in exports format with -f exports', async () => {
      const argv = ['-f', 'exports', fnames.good]

      await cli.run(argv)
      const expectedOutput = 'export SECRET=value\nexport JSON_SECRET=\'{"nested":"value"}\'\n'

      expect(formatSpy).toBeCalledWith(mappedSecrets, { format: TargetFormat.Exports })
      expect(stdoutSpy).toBeCalledWith(expectedOutput)
    })
  })

  describe('-f dotenv', () => {
    it('outputs in exports format with -f dotenv', async () => {
      const fname = fnames.good
      const argv = ['-f', 'dotenv', fname]

      await cli.run(argv)
      const expectedOutput = 'SECRET=value\nJSON_SECRET=\'{"nested":"value"}\'\n'

      expect(formatSpy).toBeCalledWith(mappedSecrets, { format: TargetFormat.Dotenv })
      expect(stdoutSpy).toBeCalledWith(expectedOutput)
    })
  })

  it('writes to a specified output file instead of stdout with -o', async () => {
    const argv = ['-o', OUTPUT_NAME, fnames.good]

    await cli.run(argv)

    expect(stdoutSpy).not.toBeCalled

    const expectedOutput = JSON.stringify(mappedSecrets)
    const output = fs.readFileSync(OUTPUT_NAME).toString()
    expect(output).toEqual(expectedOutput)
  })

  it('merges two valid, single-level files', async () => {
    const input1 = await readJSON(fnames.good)
    const input2 = await readJSON(fnames.good1)

    const expectedInput = { ...input1, ...input2 }

    const argv = [fnames.good, fnames.good1]
    await cli.run(argv)

    const args = mapStub.mock.calls[0]
    expect(JSON.stringify(args[0])).toEqual(JSON.stringify(expectedInput))
  })

  it('merges correctly with a nested file and an env provided', async () => {
    const argv = ['--env', 'production', fnames.nested]

    const file: Record<string, string> = await readJSON(fnames.nested)
    const expectedInput = file['production']

    await cli.run(argv)

    const args = mapStub.mock.calls[0]
    expect(JSON.stringify(args[0])).toEqual(JSON.stringify(expectedInput))
  })

  it('merges with two files, one nested, and an env provided', async () => {
    const argv = ['--env', 'production', fnames.good, fnames.nested]
    const input1 = await readJSON<MappingInput>(fnames.good)
    const input2 = await readJSON<Record<string, MappingInput>>(fnames.nested)

    const expectedInput = { ...input1, ...input2['production'] }

    await cli.run(argv)

    const args = mapStub.mock.calls[0]
    expect(JSON.stringify(args[0])).toEqual(JSON.stringify(expectedInput))
  })

  it('throws an exception with one environment-nested file and no env provided', async () => {
    const argv = [fnames.good, fnames.nested]

    const responseP = cli.run(argv)

    await expect(responseP).rejects.toThrow('invalid values for keys: production')
  })
})
