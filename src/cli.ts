import parseArgs from 'minimist'
import { formatOutput, TargetFormat } from './formatter'
import { SecretsMapper } from './secrets-mapper'
import { MappingOutput, NestedMappingInput } from './types'
import * as util from './util'

interface ParsedArguments {
  sources: string[]
  target: string | null
  help: boolean
  /**
   * An optional key that can be used for a nested JSON file
   *
   * If specified and the key is found as a top level key it will be assumed
   * that this is a nested object and that only this part of the tree should
   * be used
   *
   * == Example
   * {
   *   production: {
   *     ARG1: 'sm:aws:foo@/production/secret'
   *   },
   *   test: {
   *     ARG1: 'sm:aws:foo@/test/secret'
   *   }
   * }
   *
   * If env is specified as 'production' the resulting selection will be
   *
   * {
   *   ARG1: 'sm:aws:foo@/production/secret'
   * }
   */
  env: string | null
  format: TargetFormat
  strict: boolean
}

interface CLIOptions {
  secretsMapper?: SecretsMapper
}

function parseArgv(argv: string[]): ParsedArguments {
  const args = parseArgs(argv, {
    string: ['env', 'format', 'out'],
    boolean: ['help', 'strict'],
    alias: {
      h: 'help',
      e: 'env',
      f: 'format',
      o: 'out',
      s: 'strict'
    }
  })

  return {
    sources: args._.filter(Boolean),
    target: args.out,
    help: args.help || false,
    env: args.env,
    format: args.format || TargetFormat.JSON,
    strict: args.strict || false
  }
}

export class CLI {
  private secretsMapper: SecretsMapper

  constructor(opts: CLIOptions = {}) {
    this.secretsMapper = opts.secretsMapper || new SecretsMapper()
  }

  async run(argv: string[]): Promise<void> {
    const args = parseArgv(argv)
    if (args.help) {
      return this.usage()
    }

    const inputs = await this.fetchInputs(args.sources)
    const merged = this.mergeInputs(inputs, args)
    const mapped = await this.mapSecrets(merged, args)
    await this.writeResult(mapped, args)
  }

  usage(): void {
    const message = `
    Usage: secrets-mapper [-f|--format FORMAT] [-o|--out FNAME] file1 [file2]

    Merges one or more JSON files, resolves secrets from the identifier, and
    outputs a file in FORMAT (default is json) to either STDOUT or the file at
    the path specified with -o/--out.

    -f|--format FORMAT
      The format to use for the output file. Defaults to json
      Supported: one of ${Object.values(TargetFormat)} (default: json)

    -o|--out FNAME
      The file to write the results to. Defaults to STDOUT if not specified
    `

    process.stderr.write(message)
  }

  // @return array[obj]
  async fetchInputs(fileNames: string[]): Promise<NestedMappingInput[]> {
    // TODO Allow for stdin pipe via no '_' args or any _ arg being '--'
    if (fileNames.length === 0) {
      throw new Error('No input file names provided')
    }

    return Promise.all(fileNames.map((f): Promise<NestedMappingInput> => util.readJSON(f)))
  }

  private mergeInputs(inputs: NestedMappingInput[], args: ParsedArguments): MappingOutput {
    const merged = inputs.reduce<MappingOutput>((acc, current): MappingOutput => {
      return this.mergeInput(acc, current, args)
    }, {})

    return merged
  }

  private mergeInput(
    base: MappingOutput,
    input: NestedMappingInput,
    args: ParsedArguments
  ): MappingOutput {
    let obj = input

    if (args.env && obj[args.env]) {
      // detected that an environment (e.g. 'production') was provided
      // and that this input object has that key. Filter down to that key
      obj = obj[args.env] as MappingOutput
    }

    // Provide some sanity by checking for arrays or nested objects as we are
    // expecting a single-level hashmap
    const invalid = Object.keys(obj).filter((k): boolean => typeof obj[k] === 'object')
    if (invalid.length > 0) {
      throw new Error(`invalid values for keys: ${invalid}`)
    }

    return { ...base, ...(obj as MappingOutput) }
  }

  private async mapSecrets(input: MappingOutput, args: ParsedArguments): Promise<MappingOutput> {
    const opts = {
      strict: args.strict
    }

    return this.secretsMapper.mapAll(input, opts)
  }

  private async writeResult(result: MappingOutput, args: ParsedArguments): Promise<void> {
    const output = formatOutput(result, { format: args.format })
    const fname = args.target

    if (fname) {
      await util.writeFile(fname, output)
      return
    }

    process.stdout.write(output)
  }
}
