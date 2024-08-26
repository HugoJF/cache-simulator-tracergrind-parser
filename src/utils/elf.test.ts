import {readElfDump} from "./elf.ts";
import {describe, expect, it} from 'vitest'

const sample = `  [16] .text             PROGBITS        00000000000010e0 0010e0 00025e 00  AX  0   0 16
     2: 0000000000000000     0 FUNC    GLOBAL DEFAULT  UND __libc_start_main@GLIBC_2.34 (3)
    19: 0000000000000000     0 FUNC    GLOBAL DEFAULT  UND __libc_start_main@GLIBC_2.34
    38: 00000000000012d7   103 FUNC    GLOBAL DEFAULT   16 main`


describe('ELF dump parser', () => {
    it('reads sample correctly', () => {
        const {textSectionAddress, mainAddress, mainSize} = readElfDump(sample)

        expect(textSectionAddress).toBe('00000000000010e0')
        expect(mainAddress).toBe('00000000000012d7')
        expect(mainSize).toBe('103')
    });

});
