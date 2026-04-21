import { writable, type Readable } from 'svelte/store';
import type { ActionEvent, ActionEventType } from '$lib/shared/action-events';

export type ActionConnectionState = {
	connected: boolean;
	reconnecting: boolean;
	lastError: string | null;
	lastEventAt: string | null;
};

export type ActionEventHandler<TEvent extends ActionEvent = ActionEvent> = (event: TEvent) => void;

export type ActionBus = {
	state: Readable<ActionConnectionState>;
	publish: (event: ActionEvent) => void;
	subscribe: (types: ActionEventType[], handler: ActionEventHandler) => () => any;
	setConnected: (connected: boolean) => void;
	setError: (error: string | null) => void;
};

const initialState: ActionConnectionState = {
	connected: false,
	reconnecting: false,
	lastError: null,
	lastEventAt: null
};

export function createActionBus(): ActionBus {
	const handlers = new Set<{
		types: Set<ActionEventType>;
		handler: ActionEventHandler;
	}>();
	const state = writable<ActionConnectionState>(initialState);

	return {
		state: {
			subscribe: state.subscribe
		},

		publish(event) {
			state.update((current) => ({
				...current,
				lastEventAt: new Date().toISOString()
			}));

			for (const entry of handlers) {
				if (entry.types.has(event.type)) {
					entry.handler(event);
				}
			}
		},

		subscribe(types, handler) {
			const entry = {
				types: new Set(types),
				handler
			};

			handlers.add(entry);
			return () => {
				handlers.delete(entry);
			};
		},

		setConnected(connected) {
			state.update((current) => ({
				...current,
				connected,
				reconnecting: !connected,
				lastError: connected ? null : current.lastError
			}));
		},

		setError(error) {
			state.update((current) => ({
				...current,
				connected: false,
				reconnecting: true,
				lastError: error
			}));
		}
	};
}
