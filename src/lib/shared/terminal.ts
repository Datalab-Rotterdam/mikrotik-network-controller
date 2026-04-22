export type TerminalClientMessage =
	| {
			type: 'input';
			data: string;
	  }
	| {
			type: 'resize';
			cols: number;
			rows: number;
	  }
	| {
			type: 'close';
	  };

export type TerminalServerMessage =
	| {
			type: 'status';
			status: 'connecting' | 'connected' | 'closed' | 'failed';
			message: string;
	  }
	| {
			type: 'output';
			data: string;
	  };
