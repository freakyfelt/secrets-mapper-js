import { formatOutput, TargetFormat } from '../formatter'
import { MappingOutput } from '../types'

describe('formatter', () => {
  const output: MappingOutput = {
    SECRET: 'value',
    JSON_SECRET: {
      nested: 'value'
    }
  }

  describe('format docker', () => {
    it('outputs in dockerfile format with -f docker', async () => {
      const expectedOutput = 'ENV SECRET=value\nENV JSON_SECRET=\'{"nested":"value"}\'\n'

      const result = formatOutput(output, { format: TargetFormat.Docker })

      expect(result).toEqual(expectedOutput)
    })
  })

  describe('format exports', () => {
    it('outputs in exports format with -f exports', async () => {
      const expectedOutput = 'export SECRET=value\nexport JSON_SECRET=\'{"nested":"value"}\'\n'

      const result = formatOutput(output, { format: TargetFormat.Exports })

      expect(result).toEqual(expectedOutput)
    })
  })

  describe('format dotenv', () => {
    it('outputs in exports format with -f dotenv', async () => {
      const expectedOutput = 'SECRET=value\nJSON_SECRET=\'{"nested":"value"}\'\n'

      const result = formatOutput(output, { format: TargetFormat.Dotenv })

      expect(result).toEqual(expectedOutput)
    })
  })
})
