export abstract class Log {
    abstract readonly index: number;
    abstract readonly type: string;

    public abstract toJSON(): Record<string, unknown>;
}
