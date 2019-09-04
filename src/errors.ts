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
