import type {Validator} from "@sourceregistry/node-env";

export type Dispatcher<Args extends readonly any[] = any[]> = {
    type: string,
    validate: Validator<Args>,
    default: (...args: Args) => Promise<void>
}

const dispatchers = Object.values(import.meta.glob("./*.dispatcher.ts", {eager: true}) as Record<string, Dispatcher>)

export default dispatchers;

export function hasDispatchType(type: string): boolean {
    const dispatcher = dispatchers.find((dispatcher) => dispatcher.type === type)
    return dispatcher !== undefined;
}

export function dispatch<Args extends readonly any[] = any[]>(type: string, ...args: Args): ReturnType<Dispatcher<Args>['default']> {
    const dispatcher = dispatchers.find((dispatcher) => dispatcher.type === type)
    if (!dispatcher)
        throw new Error(`Unknown dispatcher type "${type}"`)
    const input = dispatcher.validate(args)
    if (!input.success)
        throw new Error(`Invalid dispatcher call "${type}"`, {cause: input.errors});
    return dispatcher.default(...input.data);
}

