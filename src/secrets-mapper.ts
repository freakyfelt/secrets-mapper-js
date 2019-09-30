import { AWSSecretsClient, SecretsClient } from '@fatlama/secrets-fetcher'
import { InvalidSecretScheme, MappingExceptions, ValueNotFound } from './errors'
import { MappingInput, MappingOutput } from './types'

type Logger = Pick<Console, 'error' | 'warn'>

/** @example 'sm:aws:/path/to/secret' */
const AWS_RAW_SCHEME_RE = /^sm:aws:([^@]+)$/
/** @example 'sm:aws:json:/path/to/secret' */
const AWS_JSON_SCHEME_RE = /^sm:aws:json:([^@]+)$/
/** @example `sm:aws:username@/path/to/secret` */
const AWS_KEYVALUE_SCHEME_RE = /^sm:aws:(.*)@(.*)$/

interface SecretsMapperOptions {
  logger?: Logger
  awsFetcher?: SecretsClient
}

interface MapOptions {
  strict?: boolean
}

// Maps a list of key/value pairs to the real secret stored in a provider identified by a scheme
//
// Useful for extracting secrets into a secret manager
//
// ## Schemes
// The following schemes are supported:
//
// aws:<key>@<secret-name>
//   e.g. 'aws:principal@MyApp/prod/fooService'
//
// Future proposed schemes include:
//   file:json:<json-path>@/path/to/file
//   file:ini:<h1>:<key>@/path/to/file
//
export class SecretsMapper {
  private awsFetcher: SecretsClient
  private logger: Logger

  constructor(opts: SecretsMapperOptions = {}) {
    this.awsFetcher = opts.awsFetcher || new AWSSecretsClient()
    this.logger = opts.logger || console
  }

  async mapAll(input: MappingInput, opts: MapOptions): Promise<MappingOutput> {
    const keys = Object.keys(input)
    const rval: MappingOutput = {}
    const errors: MappingOutput = {}

    for (const k of keys) {
      try {
        rval[k] = await this.mapSecret(input[k], opts)
      } catch (error) {
        errors[k] = error
      }
    }

    if (Object.keys(errors).length > 0) {
      this.logger.error('Found the following errors:', errors)

      throw new MappingExceptions(errors)
    }

    return rval
  }

  async mapSecret<T = string>(
    secretIdentifier: string,
    opts: MapOptions = {}
  ): Promise<null | string | T> {
    if (AWS_JSON_SCHEME_RE.test(secretIdentifier)) {
      return this.fetchAWSJSON(secretIdentifier)
    }

    if (AWS_KEYVALUE_SCHEME_RE.test(secretIdentifier)) {
      return this.fetchAWSKeyValue(secretIdentifier, opts)
    }

    if (AWS_RAW_SCHEME_RE.test(secretIdentifier)) {
      return this.fetchAWSText(secretIdentifier)
    }

    const msg = `Could not find a scheme for ${secretIdentifier}`
    if (opts.strict) {
      throw new ValueNotFound(msg)
    }

    this.logger.warn(msg)

    return secretIdentifier
  }

  async fetchAWSKeyValue<T = string>(secretIdentifier: string, opts: MapOptions): Promise<T> {
    const match = AWS_KEYVALUE_SCHEME_RE.exec(secretIdentifier)
    if (!match) {
      throw new InvalidSecretScheme(secretIdentifier)
    }
    const [, secretKey, secretName] = match

    const secret = await this.awsFetcher.fetchJSON<Record<string, T>>(secretName)

    if (!secret.hasOwnProperty(secretKey)) {
      this.handleMissing(secretIdentifier, opts)
    }

    return secret[secretKey]
  }

  async fetchAWSJSON<T>(secretIdentifier: string): Promise<T | null> {
    const match = AWS_JSON_SCHEME_RE.exec(secretIdentifier)
    if (!match) {
      return null
    }
    const [, secretName] = match

    return this.awsFetcher.fetchJSON<T>(secretName)
  }

  async fetchAWSText(secretIdentifier: string): Promise<string | null> {
    const match = AWS_RAW_SCHEME_RE.exec(secretIdentifier)
    if (!match) {
      return null
    }
    const [, secretName] = match

    return this.awsFetcher.fetchString(secretName)
  }

  private handleMissing(secretId: string, opts: MapOptions): void {
    if (opts.strict) {
      throw new ValueNotFound(secretId)
    }

    this.logger.warn(`Could not find secret for '${secretId}'`)
  }
}
