<script lang="ts">
	import { deserialize } from '$app/forms';
	import { onDestroy, onMount } from 'svelte';
	import '@xterm/xterm/css/xterm.css';
	import type { TerminalClientMessage, TerminalServerMessage } from '$lib/shared/terminal';

	let {
		action,
		variant = 'embedded'
	}: {
		action: string;
		variant?: 'embedded' | 'standalone';
	} = $props();

	let terminalElement: HTMLDivElement;
	let terminal: import('@xterm/xterm').Terminal | undefined;
	let fitAddon: import('@xterm/addon-fit').FitAddon | undefined;
	let socket: WebSocket | undefined;
	let resizeObserver: ResizeObserver | undefined;
	let status = $state<'idle' | 'connecting' | 'connected' | 'closed' | 'failed'>('idle');
	let message = $state('Ready to connect.');

	function send(payload: TerminalClientMessage) {
		if (socket?.readyState === WebSocket.OPEN) {
			socket.send(JSON.stringify(payload));
		}
	}

	function fit() {
		if (!terminal || !fitAddon) {
			return;
		}

		fitAddon.fit();
	}

	function handleServerMessage(event: MessageEvent<string>) {
		let payload: TerminalServerMessage;

		try {
			payload = JSON.parse(event.data) as TerminalServerMessage;
		} catch {
			return;
		}

		if (payload.type === 'output') {
			terminal?.write(payload.data);
			return;
		}

		status = payload.status;
		message = payload.message;
	}

	async function connect() {
		if (status === 'connecting' || status === 'connected') {
			return;
		}

		status = 'connecting';
		message = 'Requesting terminal session...';

		const response = await fetch(action, {
			method: 'POST',
			headers: {
				accept: 'application/json',
				'x-sveltekit-action': 'true',
				'Content-Type': 'application/x-www-form-urlencoded'
			},
			body: new URLSearchParams()
		});
		const result = deserialize(await response.text());

		if (result.type !== 'success' || !result.data?.url) {
			status = 'failed';
			message =
				result.type === 'failure' && typeof result.data?.message === 'string'
					? result.data.message
					: 'Terminal session could not be opened.';
			return;
		}

		socket = new WebSocket(String(result.data.url));
		socket.addEventListener('open', () => {
			status = 'connected';
			message = 'Connected.';
			fit();
		});
		socket.addEventListener('message', handleServerMessage);
		socket.addEventListener('close', () => {
			if (status !== 'failed') {
				status = 'closed';
				message = 'Terminal session closed.';
			}
		});
		socket.addEventListener('error', () => {
			status = 'failed';
			message = 'Terminal websocket failed.';
		});
	}

	function disconnect() {
		send({ type: 'close' });
		socket?.close();
	}

	onMount(async () => {
		const [{ Terminal }, { FitAddon }] = await Promise.all([
			import('@xterm/xterm'),
			import('@xterm/addon-fit')
		]);

		terminal = new Terminal({
			cursorBlink: true,
			convertEol: true,
			fontFamily: 'Menlo, Monaco, Consolas, "Liberation Mono", monospace',
			fontSize: 13,
			theme: {
				background: '#111820',
				foreground: '#d7e0e7',
				cursor: '#ffffff',
				selectionBackground: '#28445d'
			}
		});
		fitAddon = new FitAddon();
		terminal.loadAddon(fitAddon);
		terminal.open(terminalElement);
		fit();
		terminal.onData((data) => send({ type: 'input', data }));
		terminal.onResize(({ cols, rows }) => send({ type: 'resize', cols, rows }));
		terminal.writeln('Ready to connect.');

		resizeObserver = new ResizeObserver(() => fit());
		resizeObserver.observe(terminalElement);
	});

	onDestroy(() => {
		resizeObserver?.disconnect();
		disconnect();
		terminal?.dispose();
	});
</script>

<div class:standalone={variant === 'standalone'} class="terminal-pane">
	<div class="terminal-toolbar">
		<div>
			<strong>SSH Terminal</strong>
			<span class={`terminal-status status-${status}`}>{message}</span>
		</div>
		<div class="terminal-actions">
			<button class="secondary-action" type="button" onclick={connect} disabled={status === 'connecting' || status === 'connected'}>
				Connect
			</button>
			<button class="secondary-action" type="button" onclick={disconnect} disabled={status !== 'connected'}>
				Disconnect
			</button>
		</div>
	</div>
	<div class="terminal-frame">
		<div bind:this={terminalElement} class="terminal-surface" aria-label="Device SSH terminal"></div>
	</div>
</div>

<style lang="scss">
	.terminal-pane {
		display: grid;
		gap: 12px;
		min-width: 0;
	}

	.terminal-pane.standalone {
		grid-template-rows: auto minmax(0, 1fr);
		min-height: 0;
	}

	.terminal-toolbar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
	}

	.terminal-toolbar > div:first-child {
		display: grid;
		gap: 4px;
		min-width: 0;
	}

	.terminal-toolbar strong {
		color: #30373d;
		font-size: 13px;
	}

	.terminal-status {
		color: #8a949c;
		font-size: 12px;
		font-weight: 700;
		overflow-wrap: anywhere;
	}

	.status-connected {
		color: #0d704f;
	}

	.status-failed {
		color: var(--color-danger);
	}

	.terminal-actions {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		justify-content: flex-end;
	}

	.secondary-action {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-height: 34px;
		border: 1px solid #dce4e9;
		border-radius: 5px;
		padding: 0 12px;
		color: #30373d;
		background: #fbfdff;
		font-weight: 750;
		cursor: pointer;
	}

	.secondary-action:disabled {
		color: #98a2aa;
		cursor: not-allowed;
	}

	.terminal-frame {
		height: min(58vh, 520px);
		min-height: 320px;
		border: 1px solid #1d2b36;
		border-radius: 6px;
		padding: 8px;
		background: #111820;
		overflow: hidden;
	}

	.terminal-pane.standalone .terminal-frame {
		height: auto;
		min-height: 360px;
	}

	.terminal-surface {
		width: 100%;
		height: 100%;
		min-width: 0;
		min-height: 0;
		overflow: hidden;
	}

	:global(.xterm) {
		height: 100%;
	}

	@media (max-width: 760px) {
		.terminal-toolbar {
			align-items: stretch;
			flex-direction: column;
		}

		.terminal-actions {
			justify-content: flex-start;
		}
	}
</style>
