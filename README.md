[![Build Status](https://travis-ci.org/ken107/jsonpatch-observe.svg?branch=master)](https://travis-ci.org/ken107/jsonpatch-observe)

Observe an object tree for changes and generate JSON Patches ([RFC 6902](https://tools.ietf.org/html/rfc6902)).  Uses [Harmony Proxy](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy), available in NodeJS version 6.4 and above.


### Usage
```javascript
const {observe} = require("jsonpatch-observe");

let observable = observe({});
observable.$subscribe(patch => console.log(patch));
observable.a = {b:1};		//prints {op:"add", path:"a", value:{b:1}}
observable.a.b = 2;		//prints {op:"add", path:"a/b", value:2}
delete observable.a;		//prints {op:"remove", path:"a"}
```

Note that the properties of an Observable are also Observables.  This is how it's able to detect when you do `observable.a.b = 2`.


### Unobserved Properties
You can exclude certain properties from `observe` as follows:
```javascript
require("jsonpatch-observe").config.excludeProperty = function(obj, prop) {
	//return true to exclude the property
}
```


### Splice Patch
The JSONPatch standard does not specify a "splice" operation.  Without splice, Array changes are represented as a series of individual "add", "replace", and "remove" operations, which can be quite inefficient to apply.

This module supports generating the splice patch.  Enable it as follows:
```javascript
require("jsonpatch-observe").config.enableSplice = true;
```

The splice patch has the following format:
```javascript
{
	op: "splice",
	path: "/myarr/3",		//path to array index
	remove: 2,			//number of elements removed
	add: ['a','b','c']		//elements added
}
```

I created a [fork](https://github.com/ken107/JSON-Patch) of Starcounter-Jack JSONPatch library capable of consuming this non-standard splice patch.
