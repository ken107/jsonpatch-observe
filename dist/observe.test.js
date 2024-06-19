"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const observe_1 = require("./observe");
const test_utils_1 = require("./test-utils");
observe_1.config.enableSplice = true;
observe_1.config.excludeProperty = (target, prop) => typeof prop == "string" && prop.startsWith("_");
(0, test_utils_1.describe)("observe object", ({ beforeEach, afterEach, test }) => {
    let x;
    let cb;
    let tmp;
    beforeEach(() => {
        x = (0, observe_1.observe)({ a: { b: 1 } });
        cb = (0, test_utils_1.mockFunc)();
        x.$subscribe(cb);
        tmp = x.a;
    });
    test("set object property", () => {
        x.a = { c: 2 };
        (0, test_utils_1.expect)(tmp.$handler.parents).toEqual([]);
        (0, test_utils_1.expect)(x).toEqual({ a: { c: 2 } });
        (0, test_utils_1.expect)(cb.mock.calls.length).toBe(1);
        (0, test_utils_1.expect)(cb.mock.calls[0]).toEqual([{ op: "add", path: "/a", value: { c: 2 } }]);
    });
    test("delete object property", () => {
        delete x.a;
        (0, test_utils_1.expect)(tmp.$handler.parents).toEqual([]);
        (0, test_utils_1.expect)(x).toEqual({});
        (0, test_utils_1.expect)(cb.mock.calls[0]).toEqual([{ op: "remove", path: "/a" }]);
        (0, test_utils_1.expect)(cb.mock.calls.length).toBe(1);
    });
    test("shared object reference", () => {
        const y = (0, observe_1.observe)({});
        y.$subscribe(cb);
        y.a = y.b = y._c = { d: 1 };
        (0, test_utils_1.expect)(cb.mock.calls[0]).toEqual([{ op: "add", path: "/b", value: { d: 1 } }]);
        (0, test_utils_1.expect)(cb.mock.calls[1]).toEqual([{ op: "add", path: "/a", value: { d: 1 } }]);
        y.a.d = 2;
        (0, test_utils_1.expect)(cb.mock.calls[2]).toEqual([{ op: "add", path: "/b/d", value: 2 }]);
        (0, test_utils_1.expect)(cb.mock.calls[3]).toEqual([{ op: "add", path: "/a/d", value: 2 }]);
        (0, test_utils_1.expect)(cb.mock.calls.length).toBe(4);
        const t = { c: 1 };
        y.a = { d: t };
        (0, test_utils_1.expect)(cb.mock.calls[4]).toEqual([{ op: "add", path: "/a", value: { d: { c: 1 } } }]);
        y.b = { d: t };
        (0, test_utils_1.expect)(cb.mock.calls[5]).toEqual([{ op: "add", path: "/b", value: { d: { c: 1 } } }]);
        y._c = { d: t };
        y._c.d.c = 3;
        (0, test_utils_1.expect)(cb.mock.calls[6]).toEqual([{ op: "add", path: "/a/d/c", value: 3 }]);
        (0, test_utils_1.expect)(cb.mock.calls[7]).toEqual([{ op: "add", path: "/b/d/c", value: 3 }]);
        (0, test_utils_1.expect)(cb.mock.calls.length).toBe(8);
    });
});
(0, test_utils_1.describe)("observe array", ({ beforeEach, afterEach, test }) => {
    let x;
    let cb;
    let tmp;
    beforeEach(() => {
        x = (0, observe_1.observe)({ a: [1, 2, 3, { b: 4 }, 5] });
        cb = (0, test_utils_1.mockFunc)();
        x.$subscribe(cb);
        tmp = x.a[3];
    });
    test("set array element", () => {
        x.a[3] = { c: 9 };
        (0, test_utils_1.expect)(tmp.$handler.parents).toEqual([]);
        (0, test_utils_1.expect)(x).toEqual({ a: [1, 2, 3, { c: 9 }, 5] });
        (0, test_utils_1.expect)(cb.mock.calls.length).toBe(1);
        (0, test_utils_1.expect)(cb.mock.calls[0]).toEqual([{ op: "splice", path: "/a/3", remove: 1, add: [{ c: 9 }] }]);
    });
    test("set array element beyond boundary", () => {
        x.a[7] = 9;
        (0, test_utils_1.expect)(tmp.$handler.parents).toEqual([{ handler: x.a.$handler, prop: "3" }]);
        (0, test_utils_1.expect)(x).toEqual({ a: [1, 2, 3, { b: 4 }, 5, , , 9] });
        (0, test_utils_1.expect)(cb.mock.calls.length).toBe(1);
        (0, test_utils_1.expect)(cb.mock.calls[0]).toEqual([{ op: "splice", path: "/a/5", remove: 0, add: [, , 9] }]);
    });
    test("delete array element", () => {
        delete x.a[3];
        (0, test_utils_1.expect)(tmp.$handler.parents).toEqual([]);
        (0, test_utils_1.expect)(x).toEqual({ a: [1, 2, 3, , 5] });
        (0, test_utils_1.expect)(cb.mock.calls.length).toBe(1);
        (0, test_utils_1.expect)(cb.mock.calls[0]).toEqual([{ op: "splice", path: "/a/3", remove: 1, add: [,] }]);
    });
    test("set array property", () => {
        x.a.hello = "world";
        (0, test_utils_1.expect)(x.a.hello).toBe("world");
        delete x.a.hello;
        (0, test_utils_1.expect)(x.a.hello).toBe(undefined);
        (0, test_utils_1.expect)(cb.mock.calls.length).toBe(2);
        (0, test_utils_1.expect)(cb.mock.calls[0]).toEqual([{ op: "add", path: "/a/hello", value: "world" }]);
        (0, test_utils_1.expect)(cb.mock.calls[1]).toEqual([{ op: "remove", path: "/a/hello" }]);
    });
    test("copyWithin", () => {
        const rv = x.a.copyWithin(3, 0);
        (0, test_utils_1.expect)(tmp.$handler.parents).toEqual([]);
        (0, test_utils_1.expect)(rv).toBe(x.a);
        (0, test_utils_1.expect)(x).toEqual({ a: [1, 2, 3, 1, 2] });
        (0, test_utils_1.expect)(cb.mock.calls[0]).toEqual([{ op: "splice", path: "/a/3", remove: 2, add: [1, 2] }]);
        (0, test_utils_1.expect)(cb.mock.calls.length).toBe(1);
    });
    test("copyWithin negative indices", () => {
        x.a[4] = { c: 9 };
        (0, test_utils_1.expect)(cb.mock.calls[0]).toEqual([{ op: "splice", path: "/a/4", remove: 1, add: [{ c: 9 }] }]);
        const rv = x.a.copyWithin(0, -3, 50);
        (0, test_utils_1.expect)(x.a[3].$handler.parents).toEqual([{ handler: x.a.$handler, prop: "3" }, { handler: x.a.$handler, prop: "1" }]);
        (0, test_utils_1.expect)(x.a[4].$handler.parents).toEqual([{ handler: x.a.$handler, prop: "4" }, { handler: x.a.$handler, prop: "2" }]);
        (0, test_utils_1.expect)(rv).toBe(x.a);
        (0, test_utils_1.expect)(x).toEqual({ a: [3, { b: 4 }, { c: 9 }, { b: 4 }, { c: 9 }] });
        (0, test_utils_1.expect)(cb.mock.calls[1]).toEqual([{ op: "splice", path: "/a/0", remove: 3, add: [3, { b: 4 }, { c: 9 }] }]);
        (0, test_utils_1.expect)(cb.mock.calls.length).toBe(2);
    });
    test("fill", () => {
        let rv = x.a.fill(9, 1, 3);
        (0, test_utils_1.expect)(tmp.$handler.parents).toEqual([{ handler: x.a.$handler, prop: "3" }]);
        (0, test_utils_1.expect)(rv).toBe(x.a);
        (0, test_utils_1.expect)(x).toEqual({ a: [1, 9, 9, { b: 4 }, 5] });
        (0, test_utils_1.expect)(cb.mock.calls[0]).toEqual([{ op: "splice", path: "/a/1", remove: 2, add: [9, 9] }]);
        rv = x.a.fill({ c: 8 }, -3);
        (0, test_utils_1.expect)(tmp.$handler.parents).toEqual([]);
        (0, test_utils_1.expect)(rv).toBe(x.a);
        //expect(x).toEqual({a:[1,9,{c:8},{c:8},{c:8}]});
        (0, test_utils_1.expect)(cb.mock.calls[1]).toEqual([{ op: "splice", path: "/a/2", remove: 3, add: [{ c: 8 }, { c: 8 }, { c: 8 }] }]);
        x.a[2].c = 6;
        (0, test_utils_1.expect)(x).toEqual({ a: [1, 9, { c: 6 }, { c: 6 }, { c: 6 }] });
        (0, test_utils_1.expect)(cb.mock.calls[2]).toEqual([{ op: "add", path: "/a/2/c", value: 6 }]);
        (0, test_utils_1.expect)(cb.mock.calls[3]).toEqual([{ op: "add", path: "/a/3/c", value: 6 }]);
        (0, test_utils_1.expect)(cb.mock.calls[4]).toEqual([{ op: "add", path: "/a/4/c", value: 6 }]);
        rv = x.a.fill(7);
        (0, test_utils_1.expect)(rv).toBe(x.a);
        (0, test_utils_1.expect)(x).toEqual({ a: [7, 7, 7, 7, 7] });
        (0, test_utils_1.expect)(cb.mock.calls[5]).toEqual([{ op: "splice", path: "/a/0", remove: 5, add: [7, 7, 7, 7, 7] }]);
        (0, test_utils_1.expect)(cb.mock.calls.length).toBe(6);
    });
    test("pop", () => {
        const rv = x.a.pop();
        (0, test_utils_1.expect)(rv).toBe(5);
        (0, test_utils_1.expect)(x).toEqual({ a: [1, 2, 3, { b: 4 }] });
        (0, test_utils_1.expect)(cb.mock.calls[0]).toEqual([{ op: "splice", path: "/a/4", remove: 1, add: [] }]);
        (0, test_utils_1.expect)(cb.mock.calls.length).toBe(1);
    });
    test("push", () => {
        const rv = x.a.push(8, 9);
        (0, test_utils_1.expect)(rv).toBe(7);
        (0, test_utils_1.expect)(x).toEqual({ a: [1, 2, 3, { b: 4 }, 5, 8, 9] });
        (0, test_utils_1.expect)(cb.mock.calls[0]).toEqual([{ op: "splice", path: "/a/5", remove: 0, add: [8, 9] }]);
        (0, test_utils_1.expect)(cb.mock.calls.length).toBe(1);
    });
    test("reverse", () => {
        const rv = x.a.reverse();
        (0, test_utils_1.expect)(tmp.$handler.parents).toEqual([{ handler: x.a.$handler, prop: "1" }]);
        (0, test_utils_1.expect)(rv).toBe(x.a);
        (0, test_utils_1.expect)(x).toEqual({ a: [5, { b: 4 }, 3, 2, 1] });
        (0, test_utils_1.expect)(cb.mock.calls[0]).toEqual([{ op: "splice", path: "/a/0", remove: 5, add: [5, { b: 4 }, 3, 2, 1] }]);
        (0, test_utils_1.expect)(cb.mock.calls.length).toBe(1);
    });
    test("shift", () => {
        const rv = x.a.shift();
        (0, test_utils_1.expect)(tmp.$handler.parents).toEqual([{ handler: x.a.$handler, prop: "2" }]);
        (0, test_utils_1.expect)(rv).toBe(1);
        (0, test_utils_1.expect)(x).toEqual({ a: [2, 3, { b: 4 }, 5] });
        (0, test_utils_1.expect)(cb.mock.calls[0]).toEqual([{ op: "splice", path: "/a/0", remove: 1, add: [] }]);
        (0, test_utils_1.expect)(cb.mock.calls.length).toBe(1);
    });
    test("sort", () => {
        const rv = x.a.sort((a, b) => {
            if (a instanceof Object)
                return -1;
            if (b instanceof Object)
                return 1;
            return a < b ? 1 : (a > b ? -1 : 0);
        });
        (0, test_utils_1.expect)(tmp.$handler.parents).toEqual([{ handler: x.a.$handler, prop: "0" }]);
        (0, test_utils_1.expect)(rv).toBe(x.a);
        (0, test_utils_1.expect)(x).toEqual({ a: [{ b: 4 }, 5, 3, 2, 1] });
        (0, test_utils_1.expect)(cb.mock.calls[0]).toEqual([{ op: "splice", path: "/a/0", remove: 5, add: [{ b: 4 }, 5, 3, 2, 1] }]);
        (0, test_utils_1.expect)(cb.mock.calls.length).toBe(1);
    });
    test("splice", () => {
        const rv = x.a.splice(1, 3, 7, 8, 9);
        (0, test_utils_1.expect)(tmp.$handler.parents).toEqual([]);
        (0, test_utils_1.expect)(rv).toEqual([2, 3, { b: 4 }]);
        (0, test_utils_1.expect)(x).toEqual({ a: [1, 7, 8, 9, 5] });
        (0, test_utils_1.expect)(cb.mock.calls[0]).toEqual([{ op: "splice", path: "/a/1", remove: 3, add: [7, 8, 9] }]);
        (0, test_utils_1.expect)(cb.mock.calls.length).toBe(1);
    });
    test("splice negative indices", () => {
        const rv = x.a.splice(-1, 100);
        (0, test_utils_1.expect)(rv).toEqual([5]);
        (0, test_utils_1.expect)(x).toEqual({ a: [1, 2, 3, { b: 4 }] });
        (0, test_utils_1.expect)(cb.mock.calls[0]).toEqual([{ op: "splice", path: "/a/4", remove: 1, add: [] }]);
        (0, test_utils_1.expect)(cb.mock.calls.length).toBe(1);
    });
    test("unshift", () => {
        const rv = x.a.unshift(8, 9);
        (0, test_utils_1.expect)(tmp.$handler.parents).toEqual([{ handler: x.a.$handler, prop: "5" }]);
        (0, test_utils_1.expect)(rv).toBe(7);
        (0, test_utils_1.expect)(x).toEqual({ a: [8, 9, 1, 2, 3, { b: 4 }, 5] });
        (0, test_utils_1.expect)(cb.mock.calls[0]).toEqual([{ op: "splice", path: "/a/0", remove: 0, add: [8, 9] }]);
        (0, test_utils_1.expect)(cb.mock.calls.length).toBe(1);
    });
    test("array element reference", () => {
        x.a[3] = { b: 7 };
        (0, test_utils_1.expect)(cb.mock.calls[0]).toEqual([{ op: "splice", path: "/a/3", remove: 1, add: [{ b: 7 }] }]);
        x.a[3].b = 9;
        (0, test_utils_1.expect)(cb.mock.calls[1]).toEqual([{ op: "add", path: "/a/3/b", value: 9 }]);
        x.a.reverse();
        (0, test_utils_1.expect)(cb.mock.calls[2]).toEqual([{ op: "splice", path: "/a/0", remove: 5, add: [5, { b: 9 }, 3, 2, 1] }]);
        x.a[1].b = 8;
        (0, test_utils_1.expect)(x).toEqual({ a: [5, { b: 8 }, 3, 2, 1] });
        (0, test_utils_1.expect)(cb.mock.calls[3]).toEqual([{ op: "add", path: "/a/1/b", value: 8 }]);
        (0, test_utils_1.expect)(cb.mock.calls.length).toBe(4);
    });
});
