/**
 * JSONPatch Observer
 * Copyright 2015, Hai Phan <hai.phan@gmail.com>
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
"use strict";
const assert = require("assert");
const UNHANDLED = new Object();

function observe(target) {
	if (!(target instanceof Object) || target.$handler) return target;
	if (target instanceof Array) return new Proxy(target, new ArrayHandler());
	return new Proxy(target, new ObjectHandler());
}

observe.options = {
	enableSplice: false,
	excludeProperty: (target, prop) => false,
};

class Handler {
	constructor() {
		this.parents = [];
		this.subscribers = new Set();
	}
	addParent(handler, prop) {
		this.parents.push({handler, prop});
	}
	removeParent(handler, prop) {
		const index = this.parents.findIndex(parent => parent.handler == handler && parent.prop == prop);
		assert(index != -1);
		this.parents.splice(index, 1);
	}
	onPatch(patch) {
		for (const subscriber of this.subscribers) subscriber(patch);
		for (const parent of this.parents) parent.handler.onPatch(this.copyPatch(patch, "/"+parent.prop + patch.path));
	}
	get(target, prop) {
		switch (prop) {
			case "$handler": return this;
			case "$subscribe": return x => this.subscribers.add(x);
			case "$unsubscribe": return x => this.subscribers.delete(x);
			case "toJSON": return () => target.toJSON ? target.toJSON() : target;
			default: return UNHANDLED;
		}
	}
	copyPatch(patch, newPath) {
		switch (patch.op) {
			case "remove": return {op: patch.op, path: newPath};
			case "splice": return {op: patch.op, path: newPath, remove: patch.remove, add: patch.add};
			default: return {op: patch.op, path: newPath, value: patch.value};
		}
	}
}

class ObjectHandler extends Handler {
	get(target, prop) {
		const result = super.get(target, prop);
		if (result != UNHANDLED) return result;
		if (!observe.options.excludeProperty(target, prop)) {
			if (target[prop] instanceof Object && !target[prop].$handler) {
				target[prop] = observe(target[prop]);
				target[prop].$handler.addParent(this, prop);
			}
		}
		return target[prop];
	}
	set(target, prop, value) {
		if (target[prop] === value) return true;
		if (!observe.options.excludeProperty(target, prop)) {
			if (target[prop] instanceof Object && target[prop].$handler) target[prop].$handler.removeParent(this, prop);
			target[prop] = value;
			if (target[prop] instanceof Object && target[prop].$handler) target[prop].$handler.addParent(this, prop);
			this.onPatch({op: "add", path: "/"+prop, value});
		}
		else {
			target[prop] = value;
		}
		return true;
	}
	deleteProperty(target, prop) {
		if (!target.hasOwnProperty(prop)) return true;
		if (!observe.options.excludeProperty(target, prop)) {
			if (target[prop] instanceof Object && target[prop].$handler) target[prop].$handler.removeParent(this, prop);
			delete target[prop];
			this.onPatch({op: "remove", path: "/"+prop});
		}
		else {
			delete target[prop];
		}
		return true;
	}
}

class ArrayHandler extends Handler {
	get(target, prop, receiver) {
		const result = super.get(target, prop);
		if (result != UNHANDLED) return result;
		switch (prop) {
			case "copyWithin":
			case "fill":
			case "pop":
			case "push":
			case "reverse":
			case "shift":
			case "sort":
			case "splice":
			case "unshift":
				return (...args) => this[prop](receiver, target, ...args);
		}
		if (!observe.options.excludeProperty(target, prop)) {
			if (target[prop] instanceof Object && !target[prop].$handler) {
				target[prop] = observe(target[prop]);
				target[prop].$handler.addParent(this, prop);
			}
		}
		return target[prop];
	}
	set(target, prop, value) {
		if (target[prop] === value) return true;
		if (!observe.options.excludeProperty(target, prop)) {
			if (/^\d+$/.test(prop)) {
				if (prop < target.length) {
					const start = Number(prop);
					this.beforeUpdate(target, start, start+1);
					target[prop] = value;
					this.afterUpdate(target, start, start+1);
					this.generatePatches(target, start, 1, 1);
				}
				else {
					const start = target.length;
					target[prop] = value;
					this.afterUpdate(target, start, target.length);
					this.generatePatches(target, start, 0, target.length-start);
				}
			}
			else {
				if (target[prop] instanceof Object && target[prop].$handler) target[prop].$handler.removeParent(this, prop);
				target[prop] = value;
				if (target[prop] instanceof Object && target[prop].$handler) target[prop].$handler.addParent(this, prop);
				this.onPatch({op: "add", path: "/"+prop, value});
			}
		}
		else {
			target[prop] = value;
		}
		return true;
	}
	deleteProperty(target, prop) {
		if (!target.hasOwnProperty(prop)) return true;
		if (!observe.options.excludeProperty(target, prop)) {
			if (/^\d+$/.test(prop)) {
				const start = Number(prop);
				this.beforeUpdate(target, start, start+1);
				delete target[prop];
				this.generatePatches(target, start, 1, 1);
			}
			else {
				if (target[prop] instanceof Object && target[prop].$handler) target[prop].$handler.removeParent(this, prop);
				delete target[prop];
				this.onPatch({op: "remove", path: "/"+prop});
			}
		}
		else {
			delete target[prop];
		}
		return true;
	}
	copyWithin(receiver, arr, start, sourceStart, sourceEnd) {
		if (start == null) start = 0;
		else if (start < 0) start = Math.max(start+arr.length, 0);
		else start = Math.min(start, arr.length);
		if (sourceStart == null) sourceStart = 0;
		else if (sourceStart < 0) sourceStart = Math.max(sourceStart+arr.length, 0);
		else sourceStart = Math.min(sourceStart, arr.length);
		if (sourceEnd == null) sourceEnd = arr.length;
		else if (sourceEnd < 0) sourceEnd = Math.max(sourceEnd+arr.length, 0);
		else sourceEnd = Math.min(sourceEnd, arr.length);
		if (start >= arr.length || sourceStart >= sourceEnd) return receiver;
		const end = Math.min(start+(sourceEnd-sourceStart), arr.length);
		for (let i=sourceStart; i<sourceEnd; i++) this.get(arr, String(i), receiver);
		this.beforeUpdate(arr, start, end);
		arr.copyWithin(start, sourceStart, sourceEnd);
		this.afterUpdate(arr, start, end);
		this.generatePatches(arr, start, end-start, end-start);
		return receiver;
	}
	fill(receiver, arr, value, start, end) {
		if (start == null) start = 0;
		else if (start < 0) start = Math.max(start+arr.length, 0);
		else start = Math.min(start, arr.length);
		if (end == null) end = arr.length;
		else if (end < 0) end = Math.max(end+arr.length, 0);
		else end = Math.min(end, arr.length);
		if (start >= end) return receiver;
		value = observe(value);
		this.beforeUpdate(arr, start, end);
		arr.fill(value, start, end);
		this.afterUpdate(arr, start, end);
		this.generatePatches(arr, start, end-start, end-start);
		return receiver;
	}
	pop(receiver, arr) {
		if (!arr.length) return undefined;
		const start = arr.length-1;
		const end = arr.length;
		this.beforeUpdate(arr, start, end);
		const result = arr.pop();
		this.generatePatches(arr, start, 1, 0);
		return result;
	}
	push(receiver, arr, ...values) {
		const start = arr.length;
		const end = arr.length+values.length;
		const result = arr.push(...values);
		this.afterUpdate(arr, start, end);
		this.generatePatches(arr, start, 0, values.length);
		return result;
	}
	reverse(receiver, arr) {
		this.beforeUpdate(arr, 0, arr.length);
		arr.reverse();
		this.afterUpdate(arr, 0, arr.length);
		this.generatePatches(arr, 0, arr.length, arr.length);
		return receiver;
	}
	shift(receiver, arr) {
		if (!arr.length) return undefined;
		this.beforeUpdate(arr, 0, arr.length);
		const result = arr.shift();
		this.afterUpdate(arr, 0, arr.length);
		this.generatePatches(arr, 0, 1, 0);
		return result;
	}
	sort(receiver, arr, ...args) {
		this.beforeUpdate(arr, 0, arr.length);
		arr.sort(...args);
		this.afterUpdate(arr, 0, arr.length);
		this.generatePatches(arr, 0, arr.length, arr.length);
		return receiver;
	}
	splice(receiver, arr, start, deleteCount, ...add) {
		if (start == null) start = 0;
		else if (start < 0) start = Math.max(start+arr.length, 0);
		else start = Math.min(start, arr.length);
		if (deleteCount == null) deleteCount = arr.length-start;
		else deleteCount = Math.min(Math.max(deleteCount, 0), arr.length-start);
		this.beforeUpdate(arr, start, arr.length);
		const result = arr.splice(start, deleteCount, ...add);
		this.afterUpdate(arr, start, arr.length);
		this.generatePatches(arr, start, deleteCount, add.length);
		return result;
	}
	unshift(receiver, arr, ...values) {
		this.beforeUpdate(arr, 0, arr.length);
		const result = arr.unshift(...values);
		this.afterUpdate(arr, 0, arr.length);
		this.generatePatches(arr, 0, 0, values.length);
		return result;
	}
	beforeUpdate(arr, start, end) {
		for (let i=start; i<end; i++) if (arr[i] instanceof Object && arr[i].$handler) arr[i].$handler.removeParent(this, String(i));
	}
	afterUpdate(arr, start, end) {
		for (let i=start; i<end; i++) if (arr[i] instanceof Object && arr[i].$handler) arr[i].$handler.addParent(this, String(i));
	}
	generatePatches(arr, index, removedCount, addedCount) {
		if (removedCount == 0 && addedCount == 0) return;
		if (observe.options.enableSplice) {
			this.onPatch({op: "splice", path: "/"+index, remove: removedCount, add: arr.slice(index, index+addedCount)});
		}
		else {
			for (let i=0; i<Math.min(removedCount, addedCount); i++) this.onPatch({op: "replace", path: "/"+(index+i), value: arr[index+i]});
			for (let i=removedCount; i<addedCount; i++) this.onPatch({op: "add", path: "/"+(index+i), value: arr[index+i]});
			for (let i=removedCount-1; i>=addedCount; i--) this.onPatch({op: "remove", path: "/"+(index+i)});
		}
	}
}

module.exports = observe;
