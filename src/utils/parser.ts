import {Log} from "../logs/log.ts";
import {LoadLog} from "../logs/load.ts";
import {BlockLog} from "../logs/block.ts";
import {MemoryLog} from "../logs/memory.ts";

type LogType = 'M' | 'B' | 'L';

// type LogType = 'M' | 'I' | 'B';

interface UnidentifiedLog {
    type: LogType;
    line: string;
}

const TRACE_LOG_REGEX = /\[(.)] .+$/gm

const MEMORY_LOG_REGEX = /\[M\] EXEC_ID: (\d) INS_ADDRESS: ([\da-f]+) START_ADDRESS: ([\da-f]+) LENGTH: \d MODE: (W|R) DATA: ([\da-f]+)$/
const INSTRUCTION_LOG_REGEX = /\[I\] ([\da-f]+): .+$/

const logMapping: Record<LogType, (line: string, index: number) => Log> = {
    L: (line, index) => new LoadLog(line, index),
    M: (line, index) => new MemoryLog(line, index),
    // I: INSTRUCTION_LOG_REGEX,
    B: (line, index) => new BlockLog(line, index),
}

export const rawToLogLines = (raw: string): UnidentifiedLog[] => {
    const iterator = raw.matchAll(TRACE_LOG_REGEX);
    return [...iterator].map(match => ({
        type: match[1] as LogType,
        line: match[0],
    }));
}

export const parseLogLines = (lines: UnidentifiedLog[]) => {
    const knownLines = lines.filter(entry => logMapping[entry.type]);

    const parsed = knownLines.map((entry, index) => {
        const constructor = logMapping[entry.type];
        // TODO assert regex is defined
        return constructor(entry.line, index);
    })


    return parsed.filter(Boolean);
}

export const fullParse = (raw: string) => {
    const lines = rawToLogLines(raw);
    return parseLogLines(lines);
}
