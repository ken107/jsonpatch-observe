export declare const config: {
    enableSplice: boolean;
    excludeProperty: (target: any, prop: string) => boolean;
};
export declare function observe(obj: any): any;
export interface Patch {
    op: string;
    path: string;
    value?: any;
    remove?: number;
    add?: Array<any>;
}
export declare type Subscriber = (patch: Patch) => void;
