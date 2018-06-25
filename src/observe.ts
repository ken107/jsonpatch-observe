/**
 * JSONPatch Observe
 * Copyright 2018, Hai Phan <hai.phan@gmail.com>
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
"use strict";
const UNHANDLED = new Object();

export const config = {
	enableSplice: false,
	excludeProperty: (target: any, prop: string) => false,
};

export interface Options {
	deep: boolean;
}

export function observe(obj: any, opts?: Options) {
	let observable = obj.$observable;
	if (!observable) {
		const handler = obj instanceof Array ? new ArrayHandler() : new ObjectHandler();
		observable = new Proxy(obj, handler);
		Object.defineProperty(obj, "$observable", {value: observable});
		if (opts && opts.deep) {
		for (const prop in obj)
			if (!config.excludeProperty(obj, prop))
				if (obj[prop] instanceof Object)
					observe(obj[prop]).$handler.addParent(handler, prop);
		}
	}
	return observable;
}

export interface Patch {
	op: string;
	path: string;
	value?: any;
	remove?: number;
	add?: Array<any>;
}

export type Subscriber = (patch: Patch) => void;

class Handler {
	parents: Array<{handler: Handler, prop: string}>;
	subscribers: Set<Subscriber>;
	constructor() {
		this.parents = [];
		this.subscribers = new Set<Subscriber>();
	}
	addParent(handler: Handler, prop: string) {
		this.parents.push({handler, prop});
	}
	removeParent(handler: Handler, prop: string) {
		const index = this.parents.findIndex(parent => parent.handler == handler && parent.prop == prop);
		if (index != -1) this.parents.splice(index, 1);
		else console.warn("Warning: removing a non-existent parent");
	}
	onPatch(patch: Patch) {
		for (const subscriber of this.subscribers) subscriber(patch);
		for (const parent of this.parents) parent.handler.onPatch(this.copyPatch(patch, "/"+parent.prop + patch.path));
	}
	get(target: any, prop: string, receiver: any): any {
		switch (prop) {
			case "$observable": return target.$observable;
			case "$handler": return this;
			case "$subscribe": return (x: Subscriber) => this.subscribers.add(x);
			case "$unsubscribe": return (x: Subscriber) => this.subscribers.delete(x);
			case "toJSON": return () => target.toJSON ? target.toJSON() : target;
			default: return UNHANDLED;
		}
	}
	copyPatch(patch: Patch, newPath: string) {
		switch (patch.op) {
			case "remove": return {op: patch.op, path: newPath};
			case "splice": return {op: patch.op, path: newPath, remove: patch.remove, add: patch.add};
			default: return {op: patch.op, path: newPath, value: patch.value};
		}
	}
}

class ObjectHandler extends Handler {
	get(target: any, prop: string, receiver: any): any {
		const result = super.get(target, prop, receiver);
		if (result != UNHANDLED) return result;
		if (target[prop] instanceof Object) {
			let observable = target[prop].$observable;
			if (!observable) {
				observable = observe(target[prop]);
				if (!config.excludeProperty(target, prop)) observable.$handler.addParent(this, prop);
			}
			return observable;
		}
		return target[prop];
	}
	set(target: any, prop: string, value: any): boolean {
		if (target[prop] === value) return true;
		if (!config.excludeProperty(target, prop)) {
			if (target[prop] instanceof Object) {
				const observable = target[prop].$observable;
				if (observable) observable.$handler.removeParent(this, prop);
			}
			target[prop] = value;
			if (target[prop] instanceof Object) {
				let observable = target[prop].$observable;
				if (!observable) observable = observe(target[prop], {deep: true});
				observable.$handler.addParent(this, prop);
			}
			this.onPatch({op: "add", path: "/"+prop, value});
		}
		else {
			target[prop] = value;
		}
		return true;
	}
	deleteProperty(target: any, prop: string): boolean {
		if (!target.hasOwnProperty(prop)) return true;
		if (!config.excludeProperty(target, prop)) {
			if (target[prop] instanceof Object) {
				const observable = target[prop].$observable;
				if (observable) observable.$handler.removeParent(this, prop);
			}
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
	get(target: any, prop: string, receiver: any): any {
		const result = super.get(target, prop, receiver);
		if (result != UNHANDLED) return result;
		switch (prop) {
			case "copyWithin": return this.copyWithin.bind(this, receiver, target);
			case "fill": return this.fill.bind(this, receiver, target);
			case "pop": return this.pop.bind(this, receiver, target);
			case "push": return this.push.bind(this, receiver, target);
			case "reverse": return this.reverse.bind(this, receiver, target);
			case "shift": return this.shift.bind(this, receiver, target);
			case "sort": return this.sort.bind(this, receiver, target);
			case "splice": return this.splice.bind(this, receiver, target);
			case "unshift": return this.unshift.bind(this, receiver, target);
		}
		if (target[prop] instanceof Object) {
			let observable = target[prop].$observable;
			if (!observable) {
				observable = observe(target[prop]);
				if (!config.excludeProperty(target, prop)) observable.$handler.addParent(this, prop);
			}
			return observable;
		}
		return target[prop];
	}
	set(target: any, prop: string, value: any): boolean {
		if (target[prop] === value) return true;
		if (!config.excludeProperty(target, prop)) {
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
				if (target[prop] instanceof Object) {
					const observable = target[prop].$observable;
					if (observable) observable.$handler.removeParent(this, prop);
				}
				target[prop] = value;
				if (target[prop] instanceof Object) {
					let observable = target[prop].$observable;
					if (!observable) observable = observe(target[prop], {deep: true});
					observable.$handler.addParent(this, prop);
				}
				this.onPatch({op: "add", path: "/"+prop, value});
			}
		}
		else {
			target[prop] = value;
		}
		return true;
	}
	deleteProperty(target: any, prop: string): boolean {
		if (!target.hasOwnProperty(prop)) return true;
		if (!config.excludeProperty(target, prop)) {
			if (/^\d+$/.test(prop)) {
				const start = Number(prop);
				this.beforeUpdate(target, start, start+1);
				delete target[prop];
				this.generatePatches(target, start, 1, 1);
			}
			else {
				if (target[prop] instanceof Object) {
					const observable = target[prop].$observable;
					if (observable) observable.$handler.removeParent(this, prop);
				}
				delete target[prop];
				this.onPatch({op: "remove", path: "/"+prop});
			}
		}
		else {
			delete target[prop];
		}
		return true;
	}
	copyWithin(receiver: any, arr: Array<any>, start: number, sourceStart?: number, sourceEnd?: number): any {
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
		this.beforeUpdate(arr, start, end);
		arr.copyWithin(start, sourceStart, sourceEnd);
		this.afterUpdate(arr, start, end);
		this.generatePatches(arr, start, end-start, end-start);
		return receiver;
	}
	fill(receiver: any, arr: Array<any>, value: any, start?: number, end?: number): any {
		if (start == null) start = 0;
		else if (start < 0) start = Math.max(start+arr.length, 0);
		else start = Math.min(start, arr.length);
		if (end == null) end = arr.length;
		else if (end < 0) end = Math.max(end+arr.length, 0);
		else end = Math.min(end, arr.length);
		if (start >= end) return receiver;
		this.beforeUpdate(arr, start, end);
		arr.fill(value, start, end);
		this.afterUpdate(arr, start, end);
		this.generatePatches(arr, start, end-start, end-start);
		return receiver;
	}
	pop(receiver: any, arr: Array<any>): any {
		if (!arr.length) return undefined;
		const start = arr.length-1;
		const end = arr.length;
		this.beforeUpdate(arr, start, end);
		const result = arr.pop();
		this.generatePatches(arr, start, 1, 0);
		return result;
	}
	push(receiver: any, arr: Array<any>, ...values: Array<any>): number {
		const start = arr.length;
		const end = arr.length+values.length;
		const result = arr.push(...values);
		this.afterUpdate(arr, start, end);
		this.generatePatches(arr, start, 0, values.length);
		return result;
	}
	reverse(receiver: any, arr: Array<any>): any {
		this.beforeUpdate(arr, 0, arr.length);
		arr.reverse();
		this.afterUpdate(arr, 0, arr.length);
		this.generatePatches(arr, 0, arr.length, arr.length);
		return receiver;
	}
	shift(receiver: any, arr: Array<any>): any {
		if (!arr.length) return undefined;
		this.beforeUpdate(arr, 0, arr.length);
		const result = arr.shift();
		this.afterUpdate(arr, 0, arr.length);
		this.generatePatches(arr, 0, 1, 0);
		return result;
	}
	sort(receiver: any, arr: Array<any>, ...args: Array<any>): any {
		this.beforeUpdate(arr, 0, arr.length);
		arr.sort(...args);
		this.afterUpdate(arr, 0, arr.length);
		this.generatePatches(arr, 0, arr.length, arr.length);
		return receiver;
	}
	splice(receiver: any, arr: Array<any>, start: number, deleteCount: number, ...add: Array<any>): Array<any> {
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
	unshift(receiver: any, arr: Array<any>, ...values: Array<any>): number {
		this.beforeUpdate(arr, 0, arr.length);
		const result = arr.unshift(...values);
		this.afterUpdate(arr, 0, arr.length);
		this.generatePatches(arr, 0, 0, values.length);
		return result;
	}
	beforeUpdate(arr: Array<any>, start: number, end: number) {
		for (let i=start; i<end; i++)
			if (arr[i] instanceof Object) {
				const observable = arr[i].$observable;
				if (observable) observable.$handler.removeParent(this, String(i));
			}
	}
	afterUpdate(arr: Array<any>, start: number, end: number) {
		for (let i=start; i<end; i++)
			if (arr[i] instanceof Object) {
				let observable = arr[i].$observable;
				if (!observable) observable = observe(arr[i], {deep: true});
				observable.$handler.addParent(this, String(i));
			}
	}
	generatePatches(arr: Array<any>, index: number, removedCount: number, addedCount: number) {
		if (removedCount == 0 && addedCount == 0) return;
		if (config.enableSplice) {
			this.onPatch({op: "splice", path: "/"+index, remove: removedCount, add: arr.slice(index, index+addedCount)});
		}
		else {
			for (let i=0; i<Math.min(removedCount, addedCount); i++) this.onPatch({op: "replace", path: "/"+(index+i), value: arr[index+i]});
			for (let i=removedCount; i<addedCount; i++) this.onPatch({op: "add", path: "/"+(index+i), value: arr[index+i]});
			for (let i=removedCount-1; i>=addedCount; i--) this.onPatch({op: "remove", path: "/"+(index+i)});
		}
	}
}
