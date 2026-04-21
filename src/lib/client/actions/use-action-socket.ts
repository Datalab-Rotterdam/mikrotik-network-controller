import { getContext } from 'svelte';
import type { ActionBus } from './action-bus';

export const ACTION_SOCKET_CONTEXT = Symbol('action-socket');

export function useActionSocket(): ActionBus {
	const bus = getContext<ActionBus | undefined>(ACTION_SOCKET_CONTEXT);

	if (!bus) {
		throw new Error('ActionSocket context is not available.');
	}

	return bus;
}
