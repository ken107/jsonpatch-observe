export declare function observe(target: any): any;
export declare const options: {
    enableSplice: boolean;
    excludeProperty: (target: any, prop: string) => boolean;
};
export interface Patch {
    op: string;
    path: string;
    value?: any;
    remove?: number;
    add?: Array<any>;
}
export declare type Subscriber = (patch: Patch) => void;
