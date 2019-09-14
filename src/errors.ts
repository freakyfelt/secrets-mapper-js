export class ValueNotFound extends Error {
  constructor(secretId: string) {
    super(`Could not find a value for secret '${secretId}`)
    this.name = 'ValueNotFound'
  }
}

export class InvalidSecretScheme extends Error {
  constructor(secretId: string) {
    super(`Invalid scheme for secret '${secretId}'`)
    this.name = 'InvalidSecretScheme'
  }
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export class MappingExceptions extends Error {
  public readonly errors: Record<string, any>

  constructor(errors: Record<string, any>) {
    super('Could not map all secrets')
    this.errors = errors
  }
}
/* eslint-enable @typescript-eslint/no-explicit-any */
