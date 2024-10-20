import {useEffect, useMemo, useState} from 'react'
import {fullParse} from "./utils/parser.ts";
import {LoadLog} from "./logs/load.ts";
import {Address} from "./components/address.tsx";
import {BlockLog} from "./logs/block.ts";
import {Button, Card, Checkbox, CheckboxProps, Form, Input, Select, UploadProps} from "antd";
import {MemoryLog} from "./logs/memory.ts";
import Dragger from "antd/lib/upload/Dragger";
import {InboxOutlined} from '@ant-design/icons';
import {RcFile} from "antd/lib/upload";
import {computeAddressesFromElf} from "./utils/elf.ts";

function App() {
    const [mainFile, setMainFile] = useState<RcFile[]>();
    const [elfDumpFile, setElfDumpFile] = useState<RcFile[]>();

    const [rawFileData, setRawFileData] = useState('')
    const [rawElfDump, setRawElfDump] = useState<string>()

    const hasElfDumpFile = !!elfDumpFile?.length;
    useEffect(() => {
        if (!rawElfDump) {
            return;
        }
        const elfData = computeAddressesFromElf(rawElfDump)
        setTextStartAddressInput(elfData.textSection)
        setMainStartAddressInput(elfData.mainStart)
        setMainEndAddressInput(elfData.mainEnd)
    }, [rawElfDump])

    const fileName = mainFile?.[0]?.name ?? 'dump.out';
    const fileNameWithoutExtension = fileName?.replace(/\..*/, '')

    const [fileNameSelected, setFileNameSelected] = useState<string>()
    const [textStartAddressInput, setTextStartAddressInput] = useState<string>('')
    const [mainStartAddressInput, setMainStartAddressInput] = useState<string>('');
    const [mainEndAddressInput, setMainEndAddressInput] = useState<string>('');

    const [exportLoads, setExportLoads] = useState(true)
    const [exportBlocks, setExportBlocks] = useState(false)
    const [exportMemory, setExportMemory] = useState(false)
    const [filterNonSimulatorData, setFilterNonSimulatorData] = useState(true)
    const [filterMemory, setFilterMemory] = useState(true)

    const handleOnExportLoadsChange: CheckboxProps['onChange'] = (e) => setExportLoads(e.target.checked)
    const handleOnExportBlocksChange: CheckboxProps['onChange'] = (e) => setExportBlocks(e.target.checked)
    const handleOnExportMemoryChange: CheckboxProps['onChange'] = (e) => setExportMemory(e.target.checked)
    const handleOnFilterMemoryChange: CheckboxProps['onChange'] = (e) => setFilterMemory(e.target.checked)
    const handleOnFilterNonSimulatorChange: CheckboxProps['onChange'] = (e) => setFilterNonSimulatorData(e.target.checked)

    const logs = useMemo(() => {
        try {
            return fullParse(rawFileData)
        } catch (e) {
            console.error(e)
            return [];
        }
    }, [rawFileData])

    const filesLoaded = useMemo(() => {
        return logs.filter(log => log instanceof LoadLog);
    }, [logs])

    const blocks = useMemo(() => {
        return logs.filter(log => log instanceof BlockLog);
    }, [logs]);

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

    // @ts-expect-error lazy
    const goodBlockRange = useMemo(() => {
        if (!mainStartBlock || !mainEndBlock) {
            return false;
        }

        return Number(mainStartBlock.id) < Number(mainEndBlock.id);
    }, [mainStartBlock, mainEndBlock])

    const exportData = useMemo(() => {
        const filtered = logs.filter(log => {
            if (exportLoads && log instanceof LoadLog) {
                return true;
            }
            if (exportBlocks && log instanceof BlockLog) {
                if (!filterMemory || !mainStartBlock || !mainEndBlock) {
                    return true
                }

                const mainStartBlockId = Number(mainStartBlock.id);
                const mainEndBlockId = Number(mainEndBlock.id);
                const id = Number(log.id);

                return id >= mainStartBlockId && id <= mainEndBlockId;
            }

            if (!exportMemory || !(log instanceof MemoryLog)) {
                return false;
            }

            if (!filterMemory || !mainStartBlock || !mainEndBlock) {
                return true;
            }

            const mainStartBlockId = Number(mainStartBlock.id);
            const mainEndBlockId = Number(mainEndBlock.id);
            const memoryExecId = Number(log.execId);
            return memoryExecId >= mainStartBlockId && memoryExecId <= mainEndBlockId;
        })

        const sorted = filtered.sort((a, b) => {
            // @ts-expect-error lazy
            const aIndex = Number(a.id) || Number(a.execId);
            // @ts-expect-error lazy
            const bIndex = Number(b.id) || Number(b.execId);

            if (aIndex === bIndex) {
                if (a instanceof MemoryLog && b instanceof MemoryLog) {
                    return a.index - b.index;
                } else {
                    return a.type.localeCompare(b.type);
                }
            }

            return aIndex - bIndex;
        })

        if (!filterNonSimulatorData) {
            return sorted;
        }

        // @ts-expect-error lazy
        return sorted.map(i => i.startAddress).filter(Boolean)
    }, [exportBlocks, exportLoads, exportMemory, filterMemory, filterNonSimulatorData, logs, mainEndBlock, mainStartBlock]);

    function handleCopyToClipboard() {
        void navigator.clipboard.writeText(JSON.stringify(exportData));
    }

    const mainFileUploaderProps: UploadProps = {
        name: 'file',
        fileList: mainFile,
        beforeUpload: async (file) => {
            setMainFile([file])
            setRawFileData(await file.text());
        },
    };
    const elfFileUploaderProps: UploadProps = {
        name: 'file',
        fileList: elfDumpFile,
        beforeUpload: async (file) => {
            setElfDumpFile([file])
            setRawElfDump(await file.text());
        },
    };

    return (
        <div className="p-6">
            <h1 className="text-3xl">Tracergrind parser</h1>
            <div className="mt-4 flex flex-col">
                <Form.Item>
                    <Dragger {...mainFileUploaderProps}>
                        <p className="ant-upload-drag-icon">
                            <InboxOutlined/>
                        </p>
                        <p className="ant-upload-text">Click or drag file to start parsing</p>
                        <p className="ant-upload-hint">
                            Only TracerGrind texttrace dumps are supported!
                        </p>
                    </Dragger>
                </Form.Item>

                <Form.Item
                    labelCol={{span: 4}}
                    label="Main file"
                    help={<>{selectedFile && <p>
                        {selectedFile.fileName} was loaded
                      from <Address>{selectedFile.fromAddress}</Address> to <Address>{selectedFile.toAddress}</Address>
                    </p>}</>}
                >
                    <Select
                        optionFilterProp="label"
                        value={fileNameSelected}
                        onChange={(value: string) => setFileNameSelected(value)}
                        options={filesLoaded.map(file => ({value: file.fileName, label: file.fileName}))}
                    />
                </Form.Item>
                <Form.Item
                    hasFeedback
                    help={<p className="py-1">
                        Run the following shell command to get the ELF dump (ensure file is in PWD):{' '}
                        <code className="px-2 py-1 text-blue-500 font-bold font-mono bg-blue-50 select-all">{`readelf -sSW ./${fileName} | grep -e main -e text > ${fileNameWithoutExtension}.elf`}</code>
                    </p>}
                >
                    <Dragger {...elfFileUploaderProps}>
                        <p className="ant-upload-drag-icon">
                            <InboxOutlined/>
                        </p>
                        <p className="ant-upload-text">Drop ELF dump here</p>
                        <p className="ant-upload-hint">
                            Only TracerGrind texttrace dumps are supported!
                        </p>
                    </Dragger>
                </Form.Item>
                <Form.Item
                    labelCol={{span: 4}}
                    label=".text start address"
                >
                    <Input
                        autoComplete="one-time-code"
                        value={textStartAddressInput}
                        onChange={e => setTextStartAddressInput(e.target.value)}
                        disabled={hasElfDumpFile}
                    />
                </Form.Item>
                <Form.Item
                    labelCol={{span: 4}}
                    label="Function first instruction address"
                    validateStatus={mainStartBlock ? 'success' : 'warning'}
                    hasFeedback
                    help={<>{(!!mainStartOffset && !!mainStartDumpAddress) && <>
                      <p>function start offset <Address>{mainStartOffset}</Address> (located
                        at <Address>{mainStartDumpAddress}</Address>) {mainStartBlock &&
                          <span>(block ID: {mainStartBlock.id})</span>}</p>
                    </>}</>}
                >
                    <Input
                        autoComplete="one-time-code"
                        value={mainStartAddressInput}
                        onChange={e => setMainStartAddressInput(e.target.value)}
                        disabled={hasElfDumpFile}
                    />
                </Form.Item>
                <Form.Item
                    labelCol={{span: 4}}
                    label="Function last instruction address"
                    hasFeedback
                    validateStatus={mainEndBlock ? 'success' : 'warning'}
                    help={<>{(!!mainEndOffset && !!mainEndDumpAddress) && <>
                      <p>function end offset <Address>{mainEndOffset}</Address> (located
                        at <Address>{mainEndDumpAddress}</Address>) {mainEndBlock &&
                          <span>(block ID: {mainEndBlock.id})</span>}</p>
                    </>}</>}
                >
                    <Input
                        autoComplete="one-time-code"
                        value={mainEndAddressInput}
                        onChange={e => setMainEndAddressInput(e.target.value)}
                        disabled={hasElfDumpFile}
                    />
                </Form.Item>
            </div>

            <div>
                <Checkbox
                    checked={exportLoads}
                    onChange={handleOnExportLoadsChange}
                >Export loads</Checkbox>
                <Checkbox
                    checked={exportBlocks}
                    onChange={handleOnExportBlocksChange}
                >Export blocks</Checkbox>
                <Checkbox
                    checked={exportMemory}
                    onChange={handleOnExportMemoryChange}
                >Export memory (slow)</Checkbox>
                <Checkbox
                    checked={filterMemory}
                    onChange={handleOnFilterMemoryChange}
                >Filter memory by main() block range</Checkbox>
                <Checkbox
                    checked={filterNonSimulatorData}
                    onChange={handleOnFilterNonSimulatorChange}
                >Only render data user by simulator</Checkbox>
            </div>
            <Card
                className="mt-6"
                title={<div className="flex justify-between">
                    <span>
                        Exported data ({exportData.length} logs exported)
                    </span>
                    <Button type="primary" onClick={handleCopyToClipboard}>Copy to clipboard</Button>
                </div>}
                size="default"
            >
            <pre>
                {JSON.stringify(exportData, null, 4)}
            </pre>
            </Card>
        </div>
    )
}

export default App
