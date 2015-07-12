Requires Node 0.11.13 and above.

This Node script sets up a deep observer on an object that listens for changes in object tree.  When changes are detected, the callback is called with the generated array of JSON patches ([RFC 6902](https://tools.ietf.org/html/rfc6902)).

###Usage
```javascript
var observe = require("jsonpatch-observe").observe;
observe(myobj, onPatches);
function onPatches(patchesArray) {...}
```

You can specify a path for _myobj_:
```javascript
observe(myobj, onPatches, "/path/to/myobj");
```


###Splice
The JSONPatch standard does not specify a "splice" op.  So array changes will be serialized into a series of "replace", "add", and "remove" operations.  This can be very inefficient for large number of inserted or removed elements, as they occur one by one on the client side.

This script supports generating a __non-standard__ "splice" patch for array changes.  To enable this, call `observe` with a fourth parameter:
```javascript
observe(myobj, onPatches, null, true);
```

The "splice" patch has the following structure:
```
{
	op: "splice",
	path: PathToIndexInArray,
	add: ArrayOfElementsAdded,
	remove: NumberOfElementsRemoved
}
```
