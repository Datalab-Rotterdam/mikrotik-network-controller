import {clearInterval} from "node:timers";
import {EventEmitter} from "events";

export class Monitor<T extends any> extends EventEmitter<{ update: [T | undefined], error: [any] }> {

    private _value?: T = undefined;

    get value() {
        return this._value;
    }

    set value(value: T | undefined) {
        this._value = value;
        this.emit('update', value);
    }

    private _interval: NodeJS.Timeout | undefined;

    constructor(private readonly executor: () => T | Promise<T>, private config: Partial<{
        initial: T,
        interval: number,
    }>) {
        super();
        this._value = config.initial;
    }

    async update() {
        await Promise.resolve(this.executor())
            .then(
                (v) => this.value = v,
                (reason) => {
                    this.emit('error', reason);
                    this._value = undefined;
                }
            )
        return this;
    }

    start() {
        const {interval = 5000} = this.config;
        if (!this._interval) {
            this._interval = setInterval(() => this.update(), interval)
        }
        return this;
    }

    stop() {
        if (!this._interval) return this;
        clearInterval(this._interval);
    }

}
