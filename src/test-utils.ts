import { isDeepStrictEqual } from "util";

export async function describe(
  suite: string,
  setup: (opts: {beforeEach: Function, afterEach: Function, test: Function}) => void
) {
  const before: Array<Function> = []
  const after: Array<Function> = []
  const tests: Array<{name: string, run: Function}> = []
  setup({
    beforeEach: (f: Function) => before.push(f),
    afterEach: (f: Function) => after.push(f),
    test: (name: string, run: Function) => tests.push({name, run})
  })
  for (const {name, run} of tests) {
    for (const f of before) await f()
    console.log("Running test '%s' '%s'", suite, name)
    await run()
    for (const f of after) await f()
  }
}

export function expect(a: unknown) {
  return {
    toBe(b: unknown) {
      if (a !== b) {
        console.log("Received", a)
        console.log("Expected", b)
        throw new Error("Assertion failed")
      }
    },
    toEqual(b: object) {
      if (!isDeepStrictEqual(a, b)) {
        console.log("Received", a)
        console.log("Expected", b)
        throw new Error("Assertion failed")
      }
    }
  }
}

export type MockFunc = (() => void) & {
  mock: {
    calls: Array<unknown>
  }
}

export function mockFunc(): MockFunc {
  const func: MockFunc = function() {
    func.mock.calls.push(Array.from(arguments))
  }
  func.mock = {
    calls: []
  }
  return func
}
