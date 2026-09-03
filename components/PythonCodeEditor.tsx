import { Editor, MonacoDiffEditor, useMonaco } from "@monaco-editor/react"
import { useEffect, useRef, useState } from "react"
import themes from "@/utils/themes"
import { exec } from "child_process"
import { ConsoleArg } from "./PythonConsole"

const themeKeys = Object.keys(themes)

type CodeEditorProps = {
    pythonCode: string,
    updatePythonCode: Function,
    args: ConsoleArg[],
    updateArgs: Function,
    mode: "window" | "festim",
    snippetOnly: boolean,
    setSnippetOnly: Function,
    processingCode: boolean,
    evaluatingCode: boolean,
    setProcessingCode: Function,
    setEvaluatingCode: Function,
    sendPythonRequest: Function
}

export default function PythonCodeEditor({ pythonCode, evaluatingCode, processingCode, sendPythonRequest, setEvaluatingCode, setProcessingCode, updatePythonCode, args, updateArgs, mode, snippetOnly, setSnippetOnly }: CodeEditorProps) {
    // Monaco Editor States
    const monaco = useMonaco()
    const [themeName, setThemeName] = useState("vs-light")
    const [backgroundColor, setBackgroundColor] = useState("#fff")
    const [copyingCode, setCopyingCode] = useState(false)

    const FAVORITE_DEV_THEME = "Amy"
    const IN_DEVELOPMENT = !process.env.PRODUCTION

    // Key Handling for the Python Code Editor
    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.ctrlKey) {
            let key: string = e.key.toLowerCase().trim()
            console.log("Key Pressed was: ", key)
            if (key == "s") {
                e.preventDefault()
                console.log("Handling Python request")
                sendPythonRequest(pythonCode)
            } else if (key == "e") {
                e.preventDefault()
                setEvaluatingCode(!evaluatingCode)
            } else if (key == "q") {
                e.preventDefault()
                setSnippetOnly(!snippetOnly)
            } else {
                
            }
        }
    }

    useEffect(() => {
        window.addEventListener("keydown", handleKeyDown)
        return () => {
            window.removeEventListener("keydown", handleKeyDown)
        }
    }, [sendPythonRequest])


    const setTheme = (monaco : any, themeName : string,) => {
        
            if (themeName != "vs-light" && themeName != "vs-dark") {
                let theme = themes[themeName]
                console.log(theme)
                monaco.editor.defineTheme(themeName.replaceAll(/\s+/g, ""), theme)
                monaco.editor.setTheme(themeName.replaceAll(/\s+/g, ""))
                let themeBackgroundColor = theme.colors["editor.background"]
                setBackgroundColor(themeBackgroundColor)
            } else {
                if (themeName == "vs-dark") setBackgroundColor("#000")
                if (themeName == "vs-light") setBackgroundColor("#fff")
                monaco.editor.setTheme(themeName)
            }
    }

    useEffect(() => {

        if (monaco) {
            setTheme(monaco, themeName)
        }
    }, [themeName]);

    useEffect(()=>{
        if(monaco && FAVORITE_DEV_THEME && IN_DEVELOPMENT) {
            setTheme(monaco, FAVORITE_DEV_THEME)
            setThemeName(FAVORITE_DEV_THEME)
        }
    }, [monaco])
    return (
        <div className="w-full flex flex-1 container">
            <p className="font-semibold text-primary">Python Code Editor.
                <br />
            </p>
            <select value={themeName} onChange={(e) => setThemeName(e.target.value)} className="text-primary select-container" name="" id="">
                <option className="border-blue-400 border-2" value="vs-light">VS Light</option>
                <option className="border-blue-400 border-2" value="vs-dark">VS Dark</option>
                {themeKeys.map((theme) => (
                    <option className="border-blue-400 border-2" key={`themeChoice${theme}`} value={theme}>{theme}</option>
                ))
                }
            </select>
            <div style={{ backgroundColor: `${backgroundColor}` }} className="h-4/5 px-4 py-4 rounded-md">
                <Editor
                    height={"100%"}
                    theme="nightowl"
                    defaultLanguage="python"
                    value={pythonCode}
                    options={{
                        readOnly: mode == "festim", // For now we permanently fix the editor so it's read-only
                        wordWrap: "on",
                        fontSize: 14
                    }}
                    onChange={(val: string | undefined) => {
                        if (!val) return
                        updatePythonCode(val)
                    }}

                />
            </div>
            <div className="flex gap-x-6 items-between">
                {
                    mode == "festim" &&
                    <div className="flex gap-x-1">
                        <label className="flex items-center cursor-pointer relative">
                            <input type="checkbox" onChange={(e) => {
                                setSnippetOnly(!snippetOnly)
                            }} checked={snippetOnly} className={`peer appearance-none w-4 h-4 ring-transparent border rounded border-slate-200 bg-slate-100 ring-2 checked:bg-blue-500 focus:ring-blue-100`} name="" id="" />
                            <span className="absolute text-white opacity-0 peer-checked:opacity-100 top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor" stroke="currentColor" strokeWidth="1">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path>
                                </svg>
                            </span>
                        </label>
                        <p className="text-blue-400 text-sm">
                            Code Snippet Only
                        </p>
                    <span className="font-normal text-blue-200 italic text-sm">Ctrl+Q</span>
                    </div> 
                // <div className="flex gap-x-2">
                //     <label className="flex items-center cursor-pointer relative">
                //         <input type="checkbox" onChange={(e) => {
                //             setEvaluatingCode(e.target.checked)
                //         }} checked={evaluatingCode} className={`peer appearance-none w-4 h-4 ring-transparent border rounded border-slate-200 bg-slate-100 ring-2 checked:bg-blue-500 focus:ring-blue-100`} name="" id="" />
                //         <span className="absolute text-white opacity-0 peer-checked:opacity-100 top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none">
                //             <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor" stroke="currentColor" strokeWidth="1">
                //                 <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path>
                //             </svg>
                //         </span>
                //     </label>
                //     <p className="text-blue-400 text-sm">
                //         Evaluate as Expression
                //     </p>
                //     <span className="font-normal text-blue-200 italic text-sm">Ctrl+E</span>
                // </div>
                }
            </div>
            {/* <div className="flex gap-x-2 items-end">
                <button disabled={processingCode || mode == "festim"} onClick={(e) => {
                    sendPythonRequest(pythonCode)
                }} className={`px-2 py-1 cursor-pointer disabled:cursor-not-allowed disabled:bg-gray-300 hover:bg-primarybg duration-300 ease-in-out transition bg-lightbg rounded-md`}>
                    Run Code
                </button>
                <span className="font-normal text-blue-200 italic">Ctrl+S</span>
            </div> */}
            <div className="flex gap-x-2 items-end">
                <button disabled={copyingCode} onClick={async (e) => {
                    setCopyingCode(true)
                    await navigator.clipboard.writeText(pythonCode)
                    setTimeout(()=>setCopyingCode(false), 500)
                }} className={`px-2 py-1 cursor-pointer text-primary disabled:cursor-not-allowed disabled:bg-gray-300 hover:bg-primarybg duration-300 ease-in-out transition bg-lightbg rounded-md`}>
                    Copy Code
                </button>
            </div>
        </div>
    )
}