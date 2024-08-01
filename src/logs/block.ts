import {Log} from "./log.ts";

const REGEX = /\[B\] EXEC_ID: (\d+) THREAD_ID: ([\da-f]+) START_ADDRESS: ([\da-f]+) END_ADDRESS: ([\da-f]+)$/

const BigIntAsHex = (hex: string) => BigInt(`0x${hex}`);

export class BlockLog implements Log {
    public readonly index: number;
    public readonly type: string;
    public readonly id: string;
    public readonly threadId: bigint;
    public readonly startAddress: bigint;
    public readonly endAddress: bigint;

    constructor(line: string, index: number) {
        const match = line.match(REGEX);
        if (!match) {
            throw new Error(`Could not parse load log ${line}`);
        }

        this.index = index;
        this.type = 'BLOCK';
        this.id = match[1];
        this.threadId = BigIntAsHex(match[2]);
        this.startAddress = BigIntAsHex(match[3]);
        this.endAddress = BigIntAsHex(match[4]);
    }

    toJSON(): Record<string, unknown> {
        return {
            type: 'BLOCK',
            id: this.id,
            threadId: this.threadId,
            startAddress: this.startAddress,
            endAddress: this.endAddress,
        };
    }
}
