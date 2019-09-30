export type MappingInput = Record<string, string>
/**
 * Allow for a single-level mapping input to allow for files that have an environment key
 * that is then unpacked to the high level
 */
export type NestedMappingInput = Record<string, string | MappingInput>

// Must return a Key-Value object with string keys return null, a string, or a JSON object
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type MappingOutput = Record<string, string | any>
