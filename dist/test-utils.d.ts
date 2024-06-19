export declare function describe(suite: string, setup: (opts: {
    beforeEach: Function;
    afterEach: Function;
    test: Function;
}) => void): Promise<void>;
export declare function expect(a: unknown): {
    toBe(b: unknown): void;
    toEqual(b: object): void;
};
export type MockFunc = (() => void) & {
    mock: {
        calls: Array<unknown>;
    };
};
export declare function mockFunc(): MockFunc;
