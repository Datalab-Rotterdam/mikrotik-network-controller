export type TaskFailurePolicy = 'rollback' | 'stop' | 'continue';

export type StepRevertPolicy = 'required' | 'best_effort' | 'none';

export interface StepResult {
	message?: string;
	data?: Record<string, unknown>;
}

export interface TaskExecutionContext<TPayload extends Record<string, unknown> = Record<string, unknown>> {
	jobId: string;
	payload: TPayload;
	emit: (event: SchedulerEventName, detail: SchedulerEventDetail) => void;
}

export interface StepExecutionContext<TPayload extends Record<string, unknown> = Record<string, unknown>>
	extends TaskExecutionContext<TPayload> {
	stepId: string;
	stepIndex: number;
	stepName: string;
}

export interface TaskStep<TPayload extends Record<string, unknown> = Record<string, unknown>> {
	name: string;
	execute: (context: StepExecutionContext<TPayload>) => Promise<StepResult | void>;
	revert?: (context: StepExecutionContext<TPayload>) => Promise<StepResult | void>;
	revertPolicy?: StepRevertPolicy;
}

export interface TaskDefinition<TPayload extends Record<string, unknown> = Record<string, unknown>> {
	name: string;
	deviceId?: string | null;
	siteId?: string | null;
	requestedByUserId?: string | null;
	payload?: TPayload;
	maxAttempts?: number;
	failurePolicy?: TaskFailurePolicy;
	steps: TaskStep<TPayload>[];
}

export type SchedulerEventName =
	| 'job:queued'
	| 'job:started'
	| 'job:succeeded'
	| 'job:failed'
	| 'job:rolling_back'
	| 'job:reverted'
	| 'job:revert_failed'
	| 'step:started'
	| 'step:succeeded'
	| 'step:failed'
	| 'step:reverting'
	| 'step:reverted'
	| 'step:revert_failed'
	| 'step:revert_skipped';

export interface SchedulerEventDetail {
	jobId: string;
	stepId?: string;
	stepIndex?: number;
	stepName?: string;
	message?: string;
	data?: Record<string, unknown>;
}
