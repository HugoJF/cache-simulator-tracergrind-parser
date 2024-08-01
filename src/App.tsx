import {useMemo, useState} from 'react'
import {fullParse} from "./utils/parser.ts";
import {LoadLog} from "./logs/load.ts";
import {Address} from "./components/address.tsx";
import {BlockLog} from "./logs/block.ts";
import {Card, Checkbox, CheckboxProps, Form, Input, Select, UploadProps} from "antd";
import {MemoryLog} from "./logs/memory.ts";
import Dragger from "antd/lib/upload/Dragger";
import {InboxOutlined} from '@ant-design/icons';
import {RcFile} from "antd/lib/upload";

function App() {
    const [files, setFiles] = useState<RcFile[]>();
    const [rawFileData, setRawFileData] = useState('')

    const [fileNameSelected, setFileNameSelected] = useState<string>()
    const [textStartAddressInput, setTextStartAddressInput] = useState<string>('')
    const [mainStartAddressInput, setMainStartAddressInput] = useState<string>('');
    const [mainEndAddressInput, setMainEndAddressInput] = useState<string>('');

    const [exportLoads, setExportLoads] = useState(true)
    const [exportBlocks, setExportBlocks] = useState(true)
    const [exportMemory, setExportMemory] = useState(false)
    const [filterMemory, setFilterMemory] = useState(true)

    const handleOnExportLoadsChange: CheckboxProps['onChange'] = (e) => setExportLoads(e.target.checked)
    const handleOnExportBlocksChange: CheckboxProps['onChange'] = (e) => setExportBlocks(e.target.checked)
    const handleOnExportMemoryChange: CheckboxProps['onChange'] = (e) => setExportMemory(e.target.checked)
    const handleOnFilterMemoryChange: CheckboxProps['onChange'] = (e) => setFilterMemory(e.target.checked)

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

        return filtered.sort((a, b) => {
            const aIndex = Number(a.id) || Number(a.execId);
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
    }, [exportBlocks, exportLoads, exportMemory, filterMemory, logs, mainEndBlock, mainStartBlock]);

    const uploaderProps: UploadProps = {
        name: 'file',
        fileList: files,
        beforeUpload: async (file) => {
            setFiles([file])
            setRawFileData(await file.text());
        },
    };

    return (
        <div className="p-6">
            <h1 className="text-3xl">Tracergrind parser</h1>
            <div className="mt-4 flex flex-col">
                <Form.Item>
                    <Dragger {...uploaderProps}>
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
                    labelCol={{span: 4}}
                    label=".text start address"
                >
                    <Input
                        autoComplete="one-time-code"
                        value={textStartAddressInput}
                        onChange={e => setTextStartAddressInput(e.target.value)}
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
                    />
                </Form.Item>
            </div>

            <div>
                <Checkbox checked={exportLoads} onChange={handleOnExportLoadsChange}>Export loads</Checkbox>
                <Checkbox checked={exportBlocks} onChange={handleOnExportBlocksChange}>Export blocks</Checkbox>
                <Checkbox checked={exportMemory} onChange={handleOnExportMemoryChange}>Export memory (slow)</Checkbox>
                <Checkbox checked={filterMemory} onChange={handleOnFilterMemoryChange}>Filter memory by main() block range</Checkbox>
            </div>
            <Card
                className="mt-6"
                title={`Exported data (${exportData.length} logs exported)`}
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
