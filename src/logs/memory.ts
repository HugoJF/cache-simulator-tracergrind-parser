import {Log} from "./log.ts";

const MEMORY_LOG_REGEX = /\[M\] EXEC_ID: (\d+) INS_ADDRESS: ([\da-f]+) START_ADDRESS: ([\da-f]+) LENGTH: (\d+) MODE: (W|R) DATA: ?([\da-f]*)$/

const BigIntAsHex = (hex: string) => BigInt(`0x${hex}`);

export class MemoryLog implements Log {
    public readonly type: string = 'MEMORY';
    public readonly index: number;
    public readonly execId: string;
    public readonly instructionAddress: bigint;
    public readonly startAddress: bigint;
    public readonly length: string;
    public readonly mode: 'W' | 'R';
    public readonly data: bigint;

    constructor(line: string, index: number) {
        const match = line.match(MEMORY_LOG_REGEX);
        if (!match) {
            throw new Error(`Could not parse memory log ${line}`);
        }

        this.index = index;
        this.execId = match[1];
        this.instructionAddress = BigIntAsHex(match[2]);
        this.startAddress = BigIntAsHex(match[3]);
        this.length = match[4];
        this.mode = match[5] as 'W' | 'R';
        this.data = BigIntAsHex(match[6] || '0');
    }

    toJSON(): Record<string, unknown> {
        return {
            type: this.type,
            index: this.index,
            execId: this.execId,
            instructionAddress: this.instructionAddress,
            startAddress: this.startAddress,
            length: this.length,
            mode: this.mode,
            data: this.data,
        };
    }

}
