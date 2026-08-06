declare module "bun:test" {
  interface Expectation<T> {
    toBe(expected: unknown): void;
    toEqual(expected: unknown): void;
    toMatchObject(expected: unknown): void;
    toContain(expected: unknown): void;
  }

  export function expect<T>(value: T): Expectation<T>;
  export function test(name: string, callback: () => unknown | Promise<unknown>): void;
}
