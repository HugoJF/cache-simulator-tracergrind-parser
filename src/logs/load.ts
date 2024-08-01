import {Log} from "./log.ts";

const REGEX = /\[L\] Loaded (.+) from (0x[\da-f]+) to (0x[\da-f]+)$/

export class LoadLog implements Log {
    public readonly type: string = 'LOAD';
    public readonly index: number;
    public readonly fileName: string;
    public readonly fromAddress: bigint;
    public readonly toAddress: bigint;

    constructor(line: string, index: number) {
        const match = line.match(REGEX);
        if (!match) {
            throw new Error(`Could not parse load log ${line}`);
        }

        this.index = index;
        this.fileName = match[1];
        this.fromAddress = BigInt(match[2]);
        this.toAddress = BigInt(match[3]);
    }

    toJSON(): Record<string, unknown> {
        return {
            type: this.type,
            index: this.index,
            fileName: this.fileName,
            fromAddress: this.fromAddress,
            toAddress: this.toAddress,
        };
    }

}
