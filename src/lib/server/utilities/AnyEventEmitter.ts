import { EventEmitter, type EventEmitterOptions } from 'node:events';

export type EventKey = string | symbol;
export type EventMap<Events> = Record<keyof Events, any[]>;
export type IfEventMap<Events extends EventMap<Events>, True, False> = {} extends Events ? False : True;

type EventEmitterEventMap = {
	newListener: [eventName: EventKey, listener: (...args: any[]) => void];
	removeListener: [eventName: EventKey, listener: (...args: any[]) => void];
};

type KnownEventName<Events extends EventMap<Events>> = keyof Events & EventKey;
type BuiltInEventName = keyof EventEmitterEventMap & EventKey;

export type EventNames<
	Events extends EventMap<Events>,
	EventName extends EventKey = EventKey
> = IfEventMap<Events, EventName | KnownEventName<Events> | BuiltInEventName, EventKey>;

export type EventArgs<
	Events extends EventMap<Events>,
	EventName extends EventKey
> = IfEventMap<
	Events,
	EventName extends keyof Events
		? Events[EventName]
		: EventName extends keyof EventEmitterEventMap
			? EventEmitterEventMap[EventName]
			: any[],
	any[]
>;

export type EventListener<
	Events extends EventMap<Events>,
	EventName extends EventKey
> = (...args: EventArgs<Events, EventName>) => void;

export type AnyEventListenerArgs<Events extends EventMap<Events>> = IfEventMap<
	Events,
	{
		[EventName in KnownEventName<Events>]: [eventName: EventName, ...args: Events[EventName]];
	}[KnownEventName<Events>],
	[eventName: EventKey, ...args: any[]]
>;

export type AnyEventListener<Events extends EventMap<Events> = EventMap<any>> = (
	...args: AnyEventListenerArgs<Events>
) => void;

export class AnyEventEmitter<Events extends EventMap<Events> = EventMap<any>> extends EventEmitter<Events> {
	private readonly anyListeners = new Set<AnyEventListener<Events>>();

	constructor(options?: EventEmitterOptions) {
		super(options);
	}

	override emit<EventName extends EventKey>(
		eventName: EventNames<Events, EventName>,
		...args: EventArgs<Events, EventName>
	): boolean {
		const hasAnyListeners = this.anyListeners.size > 0;

		if (eventName === 'error' && !this.listenerCount(eventName) && hasAnyListeners) {
			this.emitAny(eventName, args);
			return true;
		}

		const emitted = super.emit(eventName, ...args);

		if (hasAnyListeners) {
			this.emitAny(eventName, args);
		}

		return emitted || hasAnyListeners;
	}

	any(listener: AnyEventListener<Events>): this {
		return this.onAny(listener);
	}

	onAny(listener: AnyEventListener<Events>): this {
		this.anyListeners.add(listener);
		return this;
	}

	onceAny(listener: AnyEventListener<Events>): this {
		const onceListener = ((eventName: EventKey, ...args: any[]) => {
			this.offAny(onceListener);
			(listener as (eventName: EventKey, ...args: any[]) => void)(eventName, ...args);
		}) as AnyEventListener<Events>;

		return this.onAny(onceListener);
	}

	removeAnyListener(listener: AnyEventListener<Events>): this {
		return this.offAny(listener);
	}

	offAny(listener: AnyEventListener<Events>): this {
		this.anyListeners.delete(listener);
		return this;
	}

	removeAllAnyListeners(): this {
		this.anyListeners.clear();
		return this;
	}

	private emitAny<EventName extends EventKey>(
		eventName: EventNames<Events, EventName>,
		args: EventArgs<Events, EventName>
	): void {
		for (const listener of [...this.anyListeners]) {
			(listener as (eventName: EventKey, ...args: any[]) => void)(eventName, ...args);
		}
	}
}
