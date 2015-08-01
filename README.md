This Node script:
- Deep observes an object tree (using Object.observe)
- Generate JSON Patches ([RFC 6902](https://tools.ietf.org/html/rfc6902))
- Can optionally generate non-standard "splice" patch for performance
- Requires Node 0.11.13 and above.


### Usage
Setup
```javascript
var observe = require("jsonpatch-observe").observe;
function onPatches(patchesArray) {...}
```

Observe changes to _myobj_:
```javascript
var observer = observe(myobj, onPatches);
```

Optionally specify a path for _myobj_ (this affects the _path_ of the generated patches):
```javascript
var observer = observe(myobj, onPatches, "/path/to/myobj");
```

Enable generating the "splice" patch:
```javascript
var observer = observe(myobj, onPatches, null, true);
```

Stop observing changes to _myobj_:
```javascript
observer.cancel();
```

Print some debug information:
```javascript
observer.print();
```


### Splice Patch
The JSONPatch standard does not specify a "splice" op, so array changes will be serialized into a series of "replace", "add", and "remove" operations.  This can be inefficient when inserting/removing large number of elements, because they occur one by one on the client side.

When enabled, this script will generate the following non-standard patch for array changes:
```javascript
{
	op: "splice",
	path: "/myarr/3",		//path to array index
	remove: 2,				//# elements removed
	add: ['a','b','c']		//elements added
}
```

I created a [fork](https://github.com/ken107/JSON-Patch) of Starcounter-Jack's JSONPatch library that is capable of applying this patch.
