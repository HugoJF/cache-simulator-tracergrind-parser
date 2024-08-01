import {FormEvent, useMemo, useState} from 'react'
import {fullParse} from "./utils/parser.ts";
import {LoadLog} from "./logs/load.ts";
import {Address} from "./components/address.tsx";
import {BlockLog} from "./logs/block.ts";

function App() {
    const [value, setValue] = useState('')
    const [fileNameSelected, setFileNameSelected] = useState<string>()
    const [textStartAddressInput, setTextStartAddressInput] = useState<string>('')
    const [mainStartAddressInput, setMainStartAddressInput] = useState<string>('');
    const [mainEndAddressInput, setMainEndAddressInput] = useState<string>('');

    const parsed = useMemo(() => {
        try {
            return fullParse(value)
        } catch (e) {
            console.error(e)
            return [];
        }
    }, [value])

    const filesLoaded = useMemo(() => {
        return parsed.filter(log => log instanceof LoadLog);
    }, [parsed])

    const blocks = useMemo(() => {
        return parsed.filter(log => log instanceof BlockLog);
    }, [parsed]);

    const selectedFile = useMemo(() => {
        return filesLoaded.find(log => log.fileName === fileNameSelected);
    }, [filesLoaded, fileNameSelected])

    const mainStartOffset = useMemo(() => {
        if (!textStartAddressInput || !mainStartAddressInput) {
            return undefined;
        }
        const textStartAddress = BigInt(textStartAddressInput);
        const mainStartAddress = BigInt(mainStartAddressInput);

        return mainStartAddress - textStartAddress;
    }, [textStartAddressInput, mainStartAddressInput])

    const mainEndOffset = useMemo(() => {
        if (!textStartAddressInput || !mainEndAddressInput) {
            return undefined;
        }
        const textStartAddress = BigInt(textStartAddressInput);
        const mainEndAddress = BigInt(mainEndAddressInput);

        return mainEndAddress - textStartAddress;
    }, [textStartAddressInput, mainEndAddressInput])

    const mainStartDumpAddress = useMemo(() => {
        if (!selectedFile || !mainStartOffset) {
            return undefined;
        }

        return selectedFile.fromAddress + mainStartOffset;
    }, [selectedFile, mainStartOffset]);

    const mainEndDumpAddress = useMemo(() => {
        if (!selectedFile || !mainEndOffset) {
            return undefined;
        }

        return selectedFile.fromAddress + mainEndOffset;
    }, [selectedFile, mainEndOffset]);

    const mainStartBlock = useMemo(() => {
        if (!blocks.length) {
            return undefined;
        }

        return blocks.find(block => block.startAddress === mainStartDumpAddress);
    }, [blocks, mainStartDumpAddress])

    const mainEndBlock = useMemo(() => {
        if (!blocks.length) {
            return undefined;
        }

        return blocks.find(block => block.endAddress === mainEndDumpAddress);
    }, [blocks, mainEndDumpAddress])

    const goodBlockRange = useMemo(() => {
        if (!mainStartBlock || !mainEndBlock) {
            return false;
        }

        return Number(mainStartBlock.id) < Number(mainEndBlock.id);
    }, [mainStartBlock, mainEndBlock])

    const parseEvent = async (e: FormEvent<HTMLInputElement>) => {
        const file = e.currentTarget.files[0]
        const text = await file.text();

        setValue(text);
    }

    return (
        <div className="grid grid-cols-1 min-h-dvh">
            <div className="flex flex-col">
                <input
                    type="file"
                    onInput={parseEvent}
                />
                <select
                    value={fileNameSelected}
                    onChange={e => setFileNameSelected(e.target.value)}
                >
                    <option>=== Please select target file ===</option>
                    {filesLoaded.map(log => log.fileName).map(file => (
                        <option key={file}>{file}</option>
                    ))}
                </select>
                {selectedFile && <p>
                    {selectedFile.fileName} was loaded
                  from <Address>{selectedFile.fromAddress}</Address> to <Address>{selectedFile.toAddress}</Address>
                </p>}
                <input
                    type="text"
                    placeholder=".text start address"
                    value={textStartAddressInput}
                    onChange={e => setTextStartAddressInput(e.target.value)}
                />
                <input
                    type="text"
                    placeholder="main() start address"
                    value={mainStartAddressInput}
                    onChange={e => setMainStartAddressInput(e.target.value)}
                />
                {(!!mainStartOffset && !!mainStartDumpAddress) && <>
                  <p>main() start offset <Address>{mainStartOffset}</Address> (located
                    at <Address>{mainStartDumpAddress}</Address>) {mainStartBlock &&
                      <span>(block found ID: {mainStartBlock.id})</span>}</p>
                </>}
                <input
                    type="text"
                    placeholder="main() end address"
                    value={mainEndAddressInput}
                    onChange={e => setMainEndAddressInput(e.target.value)}
                />
                {(!!mainEndOffset && !!mainEndDumpAddress) && <>
                  <p>main() end offset <Address>{mainEndOffset}</Address> (located
                    at <Address>{mainEndDumpAddress}</Address>) {mainEndBlock &&
                      <span>(block found ID: {mainEndBlock.id})</span>}</p>
                </>}
                {mainStartBlock && mainEndBlock && <p>Block range is: {goodBlockRange ? 'VALID' : 'INVALID'}</p>}
            </div>
            <pre>
                {JSON.stringify(parsed, null, 4)}
            </pre>
        </div>
    )
}

export default App
