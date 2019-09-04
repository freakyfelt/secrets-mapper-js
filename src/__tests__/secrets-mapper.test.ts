import { SecretsMapper } from '../secrets-mapper'
import { MockSecretsClient } from '@fatlama/secrets-fetcher'

const SECRET_ID = 'MyApp/valid-pair'
const NON_EXISTENT_SECRET_ID = 'MyApp/non-existent'
const secretPair = {
  principal: 'my-principal',
  credential: 'my-credential'
}

const badScheme = 'not-real:scheme@invalid'
const awsKeyValueScheme = `sm:aws:principal@${SECRET_ID}`
const awsJSONScheme = `sm:aws:json:${SECRET_ID}`

describe('SecretsMapper', () => {
  const awsFetcher = new MockSecretsClient({
    responses: {
      [SECRET_ID]: JSON.stringify(secretPair)
    }
  })
  const mapper = new SecretsMapper({
    awsFetcher
  })

  describe('AWS key/value secrets', () => {
    it('fetches the correct key from the secret', async () => {
      const result = await mapper.mapSecret(awsKeyValueScheme)
      expect(result).toEqual(secretPair.principal)
    })

    it('throws an exception with a non-existent credential', async () => {
      const missingSecret = `sm:aws:principal@${NON_EXISTENT_SECRET_ID}`
      const resultP = mapper.mapSecret(missingSecret)
      expect(resultP).rejects.toThrow(Error)
    })
  })

  describe('AWS JSON secrets', () => {
    it('fetches the correct payload from a JSON secret', async () => {
      const result = await mapper.mapSecret(awsJSONScheme)
      expect(result).toEqual(secretPair)
    })
  })

  describe('a secret without a scheme', () => {
    it('throws an error with strict: true', async () => {
      const resultP = mapper.mapSecret(badScheme, { strict: true })

      expect(resultP).rejects.toThrow(Error)
    })

    it('returns the original value by default', async () => {
      const result = await mapper.mapSecret(badScheme)

      expect(result).toEqual(badScheme)
    })
  })
})
