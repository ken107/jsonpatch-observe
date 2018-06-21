const observe = require("./observe.js");
observe.options.enableSplice = true;

describe("observe object", () => {
  let x, cb;

  beforeEach(() => {
    x = observe({a:{b:1}});
    cb = jest.fn();
    x.$subscribe(cb);
  })

  test("set object property", () => {
    x.a.b = 2;
    expect(x).toEqual({a:{b:2}});
    expect(cb.mock.calls.length).toBe(1);
    expect(cb.mock.calls[0]).toEqual([{op:"add", path:"a/b", value:2}]);
  })

  test("delete object property", () => {
    const tmp = x.a;
    delete x.a;
    expect(tmp.$handler.parents).toEqual([]);
    tmp.b = 2;
    expect(x).toEqual({});
    expect(cb.mock.calls[0]).toEqual([{op:"remove", path:"a"}]);
    expect(cb.mock.calls.length).toBe(1);
  })
})


describe("observe array", () => {
  let x, cb;

  beforeEach(() => {
    x = observe({a:[1,2,3,4,5]});
    cb = jest.fn();
    x.$subscribe(cb);
  })

  test("set array element", () => {
    x.a[3] = 9;
    expect(x).toEqual({a:[1,2,3,9,5]});
    expect(cb.mock.calls.length).toBe(1);
    expect(cb.mock.calls[0]).toEqual([{op:"splice", path:"a/3", remove:1, add:[9]}]);
  })

  test("set array element beyond boundary", () => {
    x.a[7] = 9;
    expect(x).toEqual({a:[1,2,3,4,5,undefined,undefined,9]});
    expect(cb.mock.calls.length).toBe(1);
    expect(cb.mock.calls[0]).toEqual([{op:"splice", path:"a/5", remove:0, add:[undefined,undefined,9]}]);
  })

  test("delete array element", () => {
    delete x.a[3];
    expect(x).toEqual({a:[1,2,3,undefined,5]});
    expect(cb.mock.calls.length).toBe(1);
    expect(cb.mock.calls[0]).toEqual([{op:"splice", path:"a/3", remove:1, add:[undefined]}]);
  })

  test("set array property", () => {
    x.a.hello = "world";
    expect(x.a.hello).toBe("world");
    delete x.a.hello;
    expect(x.a.hello).toBe(undefined);
    expect(cb.mock.calls.length).toBe(2);
    expect(cb.mock.calls[0]).toEqual([{op:"add", path:"a/hello", value:"world"}]);
    expect(cb.mock.calls[1]).toEqual([{op:"remove", path:"a/hello"}]);
  })

  test("copyWithin", () => {
    const rv = x.a.copyWithin(3);
    expect(rv).toBe(x.a);
    expect(x).toEqual({a:[1,2,3,1,2]});
    expect(cb.mock.calls[0]).toEqual([{op:"splice", path:"a/3", remove:2, add:[1,2]}]);
    expect(cb.mock.calls.length).toBe(1);
  })

  test("copyWithin negative indices", () => {
    const rv = x.a.copyWithin(1, -20, -2);
    expect(rv).toBe(x.a);
    expect(x).toEqual({a:[1,1,2,3,5]});
    expect(cb.mock.calls[0]).toEqual([{op:"splice", path:"a/1", remove:3, add:[1,2,3]}]);
    expect(cb.mock.calls.length).toBe(1);
  })

  test("fill", () => {
    let rv = x.a.fill(9, 1, 3);
    expect(rv).toBe(x.a);
    expect(x).toEqual({a:[1,9,9,4,5]});
    expect(cb.mock.calls[0]).toEqual([{op:"splice", path:"a/1", remove:2, add:[9,9]}]);
    rv = x.a.fill(8, -3);
    expect(rv).toBe(x.a);
    expect(x).toEqual({a:[1,9,8,8,8]});
    expect(cb.mock.calls[1]).toEqual([{op:"splice", path:"a/2", remove:3, add:[8,8,8]}]);
    rv = x.a.fill(7);
    expect(rv).toBe(x.a);
    expect(x).toEqual({a:[7,7,7,7,7]});
    expect(cb.mock.calls[2]).toEqual([{op:"splice", path:"a/0", remove:5, add:[7,7,7,7,7]}]);
    expect(cb.mock.calls.length).toBe(3);
  })

  test("pop", () => {
    const rv = x.a.pop();
    expect(rv).toBe(5);
    expect(x).toEqual({a:[1,2,3,4]});
    expect(cb.mock.calls[0]).toEqual([{op:"splice", path:"a/4", remove:1, add:[]}]);
    expect(cb.mock.calls.length).toBe(1);
  })

  test("push", () => {
    const rv = x.a.push(8,9);
    expect(rv).toBe(7);
    expect(x).toEqual({a:[1,2,3,4,5,8,9]});
    expect(cb.mock.calls[0]).toEqual([{op:"splice", path:"a/5", remove:0, add:[8,9]}]);
    expect(cb.mock.calls.length).toBe(1);
  })

  test("reverse", () => {
    const rv = x.a.reverse();
    expect(rv).toBe(x.a);
    expect(x).toEqual({a:[5,4,3,2,1]});
    expect(cb.mock.calls[0]).toEqual([{op:"splice", path:"a/0", remove:5, add:[5,4,3,2,1]}]);
    expect(cb.mock.calls.length).toBe(1);
  })

  test("shift", () => {
    const rv = x.a.shift();
    expect(rv).toBe(1);
    expect(x).toEqual({a:[2,3,4,5]});
    expect(cb.mock.calls[0]).toEqual([{op:"splice", path:"a/0", remove:1, add:[]}]);
    expect(cb.mock.calls.length).toBe(1);
  })

  test("sort", () => {
    const rv = x.a.sort((a,b) => (a<b?1:-1));
    expect(rv).toBe(x.a);
    expect(x).toEqual({a:[5,4,3,2,1]});
    expect(cb.mock.calls[0]).toEqual([{op:"splice", path:"a/0", remove:5, add:[5,4,3,2,1]}]);
    expect(cb.mock.calls.length).toBe(1);
  })

  test("splice", () => {
    const rv = x.a.splice(1,2,7,8,9);
    expect(rv).toEqual([2,3]);
    expect(x).toEqual({a:[1,7,8,9,4,5]});
    expect(cb.mock.calls[0]).toEqual([{op:"splice", path:"a/1", remove:2, add:[7,8,9]}]);
    expect(cb.mock.calls.length).toBe(1);
  })

  test("splice negative indices", () => {
    const rv = x.a.splice(-1,100);
    expect(rv).toEqual([5]);
    expect(x).toEqual({a:[1,2,3,4]});
    expect(cb.mock.calls[0]).toEqual([{op:"splice", path:"a/4", remove:1, add:[]}]);
    expect(cb.mock.calls.length).toBe(1);
  })

  test("unshift", () => {
    const rv = x.a.unshift(8,9);
    expect(rv).toEqual(7);
    expect(x).toEqual({a:[8,9,1,2,3,4,5]});
    expect(cb.mock.calls[0]).toEqual([{op:"splice", path:"a/0", remove:0, add:[8,9]}]);
    expect(cb.mock.calls.length).toBe(1);
  })

  test("array element reference", () => {
    x.a[3] = {b:7};
    expect(cb.mock.calls[0]).toEqual([{op:"splice", path:"a/3", remove:1, add:[{b:7}]}]);
    x.a[3].b = 9;
    expect(cb.mock.calls[1]).toEqual([{op:"add", path:"a/3/b", value:9}]);
    x.a.reverse();
    expect(cb.mock.calls[2]).toEqual([{op:"splice", path:"a/0", remove:5, add:[5,{b:9},3,2,1]}]);
    x.a[1].b = 8;
    expect(x).toEqual({a:[5,{b:8},3,2,1]});
    expect(cb.mock.calls[3]).toEqual([{op:"add", path:"a/1/b", value:8}]);
    expect(cb.mock.calls.length).toBe(4);
  })
})
