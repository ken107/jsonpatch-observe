/**
 * JSONPatch Observer
 * Copyright 2015, Hai Phan <hai.phan@gmail.com>
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
var count = 0;

function observe(obj, callback, path, canSplice) {
	if (path == null) path = "";
	var childObservers, active = true;
	if (obj instanceof Array) {
		Array.observe(obj, onChange);
		childObservers = [];
		for (var i=0; i<obj.length; i++) childObservers.push(typeof obj[i] == "object" && obj[i] != null ? observe(obj[i], callback, path+'/'+i, canSplice) : null);
	}
	else {
		Object.observe(obj, onChange, ["add", "update", "delete"]);
		childObservers = {};
		for (var p in obj) if (typeof obj[p] == "object" && obj[p] != null) childObservers[p] = observe(obj[p], callback, path+'/'+p, canSplice);
	}
	function onChange(changes) {
		try {
			for (var i=0; i<changes.length; i++) {
				var c = changes[i];
				switch (c.type) {
					case "add":
						if (typeof c.object[c.name] == "object" && c.object[c.name] != null) childObservers[c.name] = observe(c.object[c.name], callback, path+'/'+c.name, canSplice);
						break;
					case "update":
						if (childObservers[c.name]) childObservers[c.name].cancel(), delete childObservers[c.name];
						if (typeof c.object[c.name] == "object" && c.object[c.name] != null) childObservers[c.name] = observe(c.object[c.name], callback, path+'/'+c.name, canSplice);
						break;
					case "delete":
						if (childObservers[c.name]) childObservers[c.name].cancel(), delete childObservers[c.name];
						break;
					case "splice":
						for (var j=0; j<c.removed.length; j++) if (childObservers[c.index+j]) childObservers[c.index+j].cancel();
						var args = [c.index, c.removed.length];
						for (var j=0; j<c.addedCount; j++) {
							var obj = c.object[c.index+j];
							args.push(typeof obj == "object" && obj != null ? observe(obj, callback, path+'/'+(c.index+j), canSplice) : null);
						}
						childObservers.splice.apply(childObservers, args);
						for (var j=c.index+c.addedCount; j<childObservers.length; j++) childObservers[j].setIndex(j);
						break;
				}
			}
			callback(toPatches(path, changes, canSplice));
		}
		catch (err) {
			console.log(err.stack);
		}
	}
	count++;
	return {
		print: function() {
			if (active) {
				console.log(path);
				if (childObservers instanceof Array) for (var i=0; i<childObservers.length; i++) childObservers[i] && childObservers[i].print();
				else for (var p in childObservers) childObservers[p].print();
			}
		},
		cancel: function() {
			if (active) {
				if (obj instanceof Array) {
					Array.unobserve(obj, onChange);
					for (var i=0; i<childObservers.length; i++) if (childObservers[i]) childObservers[i].cancel();
				}
				else {
					Object.unobserve(obj, onChange);
					for (var p in childObservers) childObservers[p].cancel();
				}
				active = false;
				count--;
			}
		},
		setIndex: function(index) {
			path = path.substring(0, path.lastIndexOf("/")) + "/" + index;
		}
	};
}

function toPatches(path, changes, canSplice) {
	var patches = [];
	for (var i=0; i<changes.length; i++) {
		var c = changes[i];
		switch (c.type) {
			case "add":
				patches.push({op: "add", path: path+"/"+c.name, value: c.object[c.name]});
				break;
			case "update":
				patches.push({op: "replace", path: path+"/"+c.name, value: c.object[c.name]});
				break;
			case "delete":
				patches.push({op: "remove", path: path+"/"+c.name});
				break;
			case "splice":
				if (canSplice) patches.push({op: "splice", path: path+"/"+c.index, add: c.object.slice(c.index, c.index+c.addedCount), remove: c.removed.length});
				else {
					for (var j=0; j<Math.min(c.removed.length, c.addedCount); j++) patches.push({op: "replace", path: path+"/"+(c.index+j), value: c.object[c.index+j]});
					for (var j=c.removed.length; j<c.addedCount; j++) patches.push({op: "add", path: path+"/"+(c.index+j), value: c.object[c.index+j]});
					for (var j=c.addedCount; j<c.removed.length; j++) patches.push({op: "remove", path: path+"/"+(c.index+c.addedCount)});
				}
				break;
		}
	}
	return patches;
}

exports.observe = observe;
exports.count = function() {return count};
