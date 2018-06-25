export declare const config: {
    enableSplice: boolean;
    excludeProperty: (target: any, prop: string) => boolean;
};
export interface Options {
    deep: boolean;
}
export declare function observe(obj: any, opts?: Options): any;
export interface Patch {
    op: string;
    path: string;
    value?: any;
    remove?: number;
    add?: Array<any>;
}
export declare type Subscriber = (patch: Patch) => void;
