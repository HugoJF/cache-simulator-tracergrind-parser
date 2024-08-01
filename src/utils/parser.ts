import {Log} from "../logs/log.ts";
import {LoadLog} from "../logs/load.ts";
import {BlockLog} from "../logs/block.ts";

type LogType = 'B' | 'L';

// type LogType = 'M' | 'I' | 'B';

interface UnidentifiedLog {
    type: LogType;
    line: string;
}

const TRACE_LOG_REGEX = /\[(.)] .+$/gm

const MEMORY_LOG_REGEX = /\[M\] EXEC_ID: (\d) INS_ADDRESS: ([\da-f]+) START_ADDRESS: ([\da-f]+) LENGTH: \d MODE: (W|R) DATA: ([\da-f]+)$/
const INSTRUCTION_LOG_REGEX = /\[I\] ([\da-f]+): .+$/

const logMapping: Record<LogType, (line: string) => Log> = {
    L: line => new LoadLog(line),
    // M: line => new MemoryLog(line),
    // I: INSTRUCTION_LOG_REGEX,
    B: line => new BlockLog(line),
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

    const parsed = knownLines.map(entry => {
        const constructor = logMapping[entry.type];
        // TODO assert regex is defined
        return constructor(entry.line);
    })


    return parsed.filter(Boolean);
}

export const fullParse = (raw: string) => {
    const lines = rawToLogLines(raw);
    return parseLogLines(lines);
}
