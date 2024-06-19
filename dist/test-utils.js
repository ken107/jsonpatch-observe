"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mockFunc = exports.expect = exports.describe = void 0;
const util_1 = require("util");
async function describe(suite, setup) {
    const before = [];
    const after = [];
    const tests = [];
    setup({
        beforeEach: (f) => before.push(f),
        afterEach: (f) => after.push(f),
        test: (name, run) => tests.push({ name, run })
    });
    for (const { name, run } of tests) {
        for (const f of before)
            await f();
        console.log("Running test '%s' '%s'", suite, name);
        await run();
        for (const f of after)
            await f();
    }
}
exports.describe = describe;
function expect(a) {
    return {
        toBe(b) {
            if (a !== b) {
                console.log("Received", a);
                console.log("Expected", b);
                throw new Error("Assertion failed");
            }
        },
        toEqual(b) {
            if (!(0, util_1.isDeepStrictEqual)(a, b)) {
                console.log("Received", a);
                console.log("Expected", b);
                throw new Error("Assertion failed");
            }
        }
    };
}
exports.expect = expect;
function mockFunc() {
    const func = function () {
        func.mock.calls.push(Array.from(arguments));
    };
    func.mock = {
        calls: []
    };
    return func;
}
exports.mockFunc = mockFunc;
