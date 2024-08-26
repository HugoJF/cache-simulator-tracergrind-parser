const textSectionRegex = /.text +PROGBITS +([^ ]+)/
const mainFunctionRegex = /\d+: ([^ ]+).+?(\d+) FUNC +GLOBAL DEFAULT +\d+ main/m

export const readElfDump = (raw: string) => {
    const textSection = raw.match(textSectionRegex)
    if (!textSection) {
        throw new Error('Could not find .text section')
    }

    const mainFunction = raw.match(mainFunctionRegex)
    if (!mainFunction) {
        throw new Error('Could not find main function')
    }


    return {
        textSectionAddress: textSection[1],
        mainAddress: mainFunction[1],
        mainSize: mainFunction[2],
    } as const
}

export const computeAddressesFromElf = (raw: string) => {
    const {textSectionAddress, mainAddress, mainSize} = readElfDump(raw)
    const textSection = BigInt(`0x${textSectionAddress}`)
    const mainStart = BigInt(`0x${mainAddress}`)
    const mainEnd = mainStart + BigInt(mainSize) - 1n; // 0x0 to 0x1 is size 2 but delta is only 1 (reverse logic)

    return {
        textSection: `0x${textSection.toString(16)}`,
        mainStart: `0x${mainStart.toString(16)}`,
        mainEnd: `0x${mainEnd.toString(16)}`,
    }
}
