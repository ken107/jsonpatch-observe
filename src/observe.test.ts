import { observe, options, Subscriber } from "./observe.js";
options.enableSplice = true;

type Observable = {
  $subscribe?: (x: Subscriber) => void,
  $handler?: {
    parents: Array<any>
  }
};

type TestObject = Observable & {c: number};

describe("observe object", () => {
  let x: Observable & {a: TestObject};
  let cb: jest.Mock;
  let tmp: TestObject;

  beforeEach(() => {
    x = observe({a:{b:1}});
    cb = jest.fn();
    x.$subscribe(cb);
    tmp = x.a;
  })

  test("set object property", () => {
    x.a = {c:2};
    expect(tmp.$handler.parents).toEqual([]);
    expect(x).toEqual({a:{c:2}});
    expect(cb.mock.calls.length).toBe(1);
    expect(cb.mock.calls[0]).toEqual([{op:"add", path:"/a", value:{c:2}}]);
  })

  test("delete object property", () => {
    delete x.a;
    expect(tmp.$handler.parents).toEqual([]);
    expect(x).toEqual({});
    expect(cb.mock.calls[0]).toEqual([{op:"remove", path:"/a"}]);
    expect(cb.mock.calls.length).toBe(1);
  })
})


describe("observe array", () => {
  let x: Observable & {
    a: Observable & Array<any> & {hello: string}
  };
  let cb: jest.Mock;
  let tmp: TestObject;

  beforeEach(() => {
    x = observe({a:[1,2,3,{b:4},5]});
    cb = jest.fn();
    x.$subscribe(cb);
    tmp = x.a[3];
  })

  test("set array element", () => {
    x.a[3] = {c:9};
    expect(tmp.$handler.parents).toEqual([]);
    expect(x).toEqual({a:[1,2,3,{c:9},5]});
    expect(cb.mock.calls.length).toBe(1);
    expect(cb.mock.calls[0]).toEqual([{op:"splice", path:"/a/3", remove:1, add:[{c:9}]}]);
  })

  test("set array element beyond boundary", () => {
    x.a[7] = 9;
    expect(tmp.$handler.parents).toEqual([{handler:x.a.$handler, prop:"3"}]);
    expect(x).toEqual({a:[1,2,3,{b:4},5,undefined,undefined,9]});
    expect(cb.mock.calls.length).toBe(1);
    expect(cb.mock.calls[0]).toEqual([{op:"splice", path:"/a/5", remove:0, add:[undefined,undefined,9]}]);
  })

  test("delete array element", () => {
    delete x.a[3];
    expect(tmp.$handler.parents).toEqual([]);
    expect(x).toEqual({a:[1,2,3,undefined,5]});
    expect(cb.mock.calls.length).toBe(1);
    expect(cb.mock.calls[0]).toEqual([{op:"splice", path:"/a/3", remove:1, add:[undefined]}]);
  })

  test("set array property", () => {
    x.a.hello = "world";
    expect(x.a.hello).toBe("world");
    delete x.a.hello;
    expect(x.a.hello).toBe(undefined);
    expect(cb.mock.calls.length).toBe(2);
    expect(cb.mock.calls[0]).toEqual([{op:"add", path:"/a/hello", value:"world"}]);
    expect(cb.mock.calls[1]).toEqual([{op:"remove", path:"/a/hello"}]);
  })

  test("copyWithin", () => {
    const rv = x.a.copyWithin(3,0);
    expect(tmp.$handler.parents).toEqual([]);
    expect(rv).toBe(x.a);
    expect(x).toEqual({a:[1,2,3,1,2]});
    expect(cb.mock.calls[0]).toEqual([{op:"splice", path:"/a/3", remove:2, add:[1,2]}]);
    expect(cb.mock.calls.length).toBe(1);
  })

  test("copyWithin negative indices", () => {
    x.a[4] = {c:9};
    expect(cb.mock.calls[0]).toEqual([{op:"splice", path:"/a/4", remove:1, add:[{c:9}]}]);
    const rv = x.a.copyWithin(0, -3, 50);
    expect(x.a[3].$handler.parents).toEqual([{handler:x.a.$handler, prop:"3"}, {handler:x.a.$handler, prop:"1"}]);
    expect(x.a[4].$handler.parents).toEqual([{handler:x.a.$handler, prop:"4"}, {handler:x.a.$handler, prop:"2"}]);
    expect(rv).toBe(x.a);
    expect(x).toEqual({a:[3,{b:4},{c:9},{b:4},{c:9}]});
    expect(cb.mock.calls[1]).toEqual([{op:"splice", path:"/a/0", remove:3, add:[3,{b:4},{c:9}]}]);
    expect(cb.mock.calls.length).toBe(2);
  })

  test("fill", () => {
    let rv = x.a.fill(9, 1, 3);
    expect(tmp.$handler.parents).toEqual([{handler:x.a.$handler, prop:"3"}]);
    expect(rv).toBe(x.a);
    expect(x).toEqual({a:[1,9,9,{b:4},5]});
    expect(cb.mock.calls[0]).toEqual([{op:"splice", path:"/a/1", remove:2, add:[9,9]}]);
    rv = x.a.fill({c:8}, -3);
    expect(tmp.$handler.parents).toEqual([]);
    expect(rv).toBe(x.a);
    //expect(x).toEqual({a:[1,9,{c:8},{c:8},{c:8}]});
    expect(cb.mock.calls[1]).toEqual([{op:"splice", path:"/a/2", remove:3, add:[{c:8},{c:8},{c:8}]}]);
    x.a[2].c = 6;
    expect(x).toEqual({a:[1,9,{c:6},{c:6},{c:6}]});
    expect(cb.mock.calls[2]).toEqual([{op:"add", path:"/a/2/c", value:6}]);
    expect(cb.mock.calls[3]).toEqual([{op:"add", path:"/a/3/c", value:6}]);
    expect(cb.mock.calls[4]).toEqual([{op:"add", path:"/a/4/c", value:6}]);
    rv = x.a.fill(7);
    expect(rv).toBe(x.a);
    expect(x).toEqual({a:[7,7,7,7,7]});
    expect(cb.mock.calls[5]).toEqual([{op:"splice", path:"/a/0", remove:5, add:[7,7,7,7,7]}]);
    expect(cb.mock.calls.length).toBe(6);
  })

  test("pop", () => {
    const rv = x.a.pop();
    expect(rv).toBe(5);
    expect(x).toEqual({a:[1,2,3,{b:4}]});
    expect(cb.mock.calls[0]).toEqual([{op:"splice", path:"/a/4", remove:1, add:[]}]);
    expect(cb.mock.calls.length).toBe(1);
  })

  test("push", () => {
    const rv = x.a.push(8,9);
    expect(rv).toBe(7);
    expect(x).toEqual({a:[1,2,3,{b:4},5,8,9]});
    expect(cb.mock.calls[0]).toEqual([{op:"splice", path:"/a/5", remove:0, add:[8,9]}]);
    expect(cb.mock.calls.length).toBe(1);
  })

  test("reverse", () => {
    const rv = x.a.reverse();
    expect(tmp.$handler.parents).toEqual([{handler:x.a.$handler, prop:"1"}]);
    expect(rv).toBe(x.a);
    expect(x).toEqual({a:[5,{b:4},3,2,1]});
    expect(cb.mock.calls[0]).toEqual([{op:"splice", path:"/a/0", remove:5, add:[5,{b:4},3,2,1]}]);
    expect(cb.mock.calls.length).toBe(1);
  })

  test("shift", () => {
    const rv = x.a.shift();
    expect(tmp.$handler.parents).toEqual([{handler:x.a.$handler, prop:"2"}]);
    expect(rv).toBe(1);
    expect(x).toEqual({a:[2,3,{b:4},5]});
    expect(cb.mock.calls[0]).toEqual([{op:"splice", path:"/a/0", remove:1, add:[]}]);
    expect(cb.mock.calls.length).toBe(1);
  })

  test("sort", () => {
    const rv = x.a.sort((a: any, b: any) => {
      if (a instanceof Object) return -1;
      if (b instanceof Object) return 1;
      return a < b ? 1 : (a > b ? -1 : 0);
    });
    expect(tmp.$handler.parents).toEqual([{handler:x.a.$handler, prop:"0"}]);
    expect(rv).toBe(x.a);
    expect(x).toEqual({a:[{b:4},5,3,2,1]});
    expect(cb.mock.calls[0]).toEqual([{op:"splice", path:"/a/0", remove:5, add:[{b:4},5,3,2,1]}]);
    expect(cb.mock.calls.length).toBe(1);
  })

  test("splice", () => {
    const rv = x.a.splice(1,3,7,8,9);
    expect(tmp.$handler.parents).toEqual([]);
    expect(rv).toEqual([2,3,{b:4}]);
    expect(x).toEqual({a:[1,7,8,9,5]});
    expect(cb.mock.calls[0]).toEqual([{op:"splice", path:"/a/1", remove:3, add:[7,8,9]}]);
    expect(cb.mock.calls.length).toBe(1);
  })

  test("splice negative indices", () => {
    const rv = x.a.splice(-1,100);
    expect(rv).toEqual([5]);
    expect(x).toEqual({a:[1,2,3,{b:4}]});
    expect(cb.mock.calls[0]).toEqual([{op:"splice", path:"/a/4", remove:1, add:[]}]);
    expect(cb.mock.calls.length).toBe(1);
  })

  test("unshift", () => {
    const rv = x.a.unshift(8,9);
    expect(tmp.$handler.parents).toEqual([{handler:x.a.$handler, prop:"5"}]);
    expect(rv).toEqual(7);
    expect(x).toEqual({a:[8,9,1,2,3,{b:4},5]});
    expect(cb.mock.calls[0]).toEqual([{op:"splice", path:"/a/0", remove:0, add:[8,9]}]);
    expect(cb.mock.calls.length).toBe(1);
  })

  test("array element reference", () => {
    x.a[3] = {b:7};
    expect(cb.mock.calls[0]).toEqual([{op:"splice", path:"/a/3", remove:1, add:[{b:7}]}]);
    x.a[3].b = 9;
    expect(cb.mock.calls[1]).toEqual([{op:"add", path:"/a/3/b", value:9}]);
    x.a.reverse();
    expect(cb.mock.calls[2]).toEqual([{op:"splice", path:"/a/0", remove:5, add:[5,{b:9},3,2,1]}]);
    x.a[1].b = 8;
    expect(x).toEqual({a:[5,{b:8},3,2,1]});
    expect(cb.mock.calls[3]).toEqual([{op:"add", path:"/a/1/b", value:8}]);
    expect(cb.mock.calls.length).toBe(4);
  })
})
