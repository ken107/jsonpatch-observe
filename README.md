Requires Node 0.11.13 and above.

This Node script sets up a deep observer on an object that listens for changes in object tree.  When changes are detected, the callback is called with the generated patches array (RFC 6902).

###USAGE
```javascript
var observe = require("jsonpatch-observe").observe;
observe(myobj, onPatches);

function onPatches(arrayOfPatches) {
	...
}
```

###Non-Conformance
This script generates a __non-standard__ "splice" patch for array changes:

```
{
	op: "splice",
	path: PathToIndexInArray,
	add: ArrayOfElementsAdded,
	remove: NumberOfElementsRemoved
}
```
