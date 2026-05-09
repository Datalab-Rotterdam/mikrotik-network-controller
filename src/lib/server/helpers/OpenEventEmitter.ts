import { EventEmitter } from 'node:events';

export type EventMap<T> = Record<keyof T, any[]>;

type IfEventMap<Events extends EventMap<Events>, True, False> = {} extends Events ? False : True;

interface EventEmitterEventMap {
	newListener: [eventName: string | symbol, listener: (...args: any[]) => void];
	removeListener: [eventName: string | symbol, listener: (...args: any[]) => void];
}

type EventNames<Events extends EventMap<Events>, EventName extends string | symbol> = IfEventMap<
	Events,
	EventName | (keyof Events & (string | symbol)) | keyof EventEmitterEventMap,
	string | symbol
>;

type Args<Events extends EventMap<Events>, EventName extends string | symbol> = IfEventMap<
	Events,
	EventName extends keyof Events
		? Events[EventName]
		: EventName extends keyof EventEmitterEventMap
			? EventEmitterEventMap[EventName]
			: any[],
	any[]
>;

export type OpenListener<K extends EventMap<any>> = <T extends EventNames<K, string | symbol>>(
	type: T,
	...args: Args<K, T>
) => void;

export class OpenEventEmitter<T extends EventMap<T> = any> extends EventEmitter<T> {
	private readonly anyListeners = new Set<OpenListener<T>>();

	any(listener: OpenListener<T>): this {
		this.anyListeners.add(listener);
		return this;
	}

	removeAny(listener: OpenListener<T>): this {
		this.anyListeners.delete(listener);
		return this;
	}

	emit<E extends string | symbol>(eventName: EventNames<T, E>, ...args: Args<T, E>): boolean {
		const emittedToNamedListeners = super.emit(eventName, ...args);

		for (const listener of this.anyListeners) {
			listener(eventName, ...args);
		}

		return emittedToNamedListeners || this.anyListeners.size > 0;
	}
}
