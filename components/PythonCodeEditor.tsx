"use client"
// TODO: 
// - Handle the output from /exec and /eval, 
// - Handle the errors from /exec and /eval, 
// - Establish a peristent namespace
// - Establish only variable, function names but not libraries in namespace

import { Editor, MonacoDiffEditor, useMonaco } from "@monaco-editor/react"
import { useEffect, useRef, useState } from "react"
import themes from "@/utils/themes"
import { exec } from "child_process"

const themeKeys = Object.keys(themes)

export default function PythonCodeEditor() {
    const monaco = useMonaco()
    const [pythonCode, setPythonCode] = useState("")
    const [themeName, setThemeName] = useState("vs-light")
    const [backgroundColor, setBackgroundColor] = useState("#fff")
    const [evaluateCode, setEvaluateCode] = useState(true)
    const [processingCode, setProcessingCode] = useState(false)
    const [output, setOutput] = useState("")
    const [errorOutput, setErrorOutput] = useState("")

    const sendPythonRequest = async (code: string) => {
        setProcessingCode(true)
        let apiURL = evaluateCode ? "/api/eval" : "/api/exec"
        console.log("Code passed in: ", JSON.stringify({code}))

        try {
            let data = await fetch(apiURL, {
                method: "POST",
                body: JSON.stringify({
                    code
                }),
                headers: {
                    "Content-Type": "application/json"
                }
            }).then(res => res.json())

            console.log("Data: ", data)

            if (data.error) {
                handleMessage(data.error, "error")
            } else {
                console.log(`Data from ${apiURL},`, data)
            }
        } catch (error) {
            const errorMessage = `Failed to send the request Python code snippet to ${apiURL}`
            console.log(error)
            console.log(errorMessage)
            handleMessage(errorMessage, "error")
        }
        setProcessingCode(false)

    }

    const handleMessage = (message: string, type: string = "message") => {

    }

    useEffect(() => {

        if (monaco) {
            if (themeName != "vs-light" && themeName != "vs-dark") {
                let theme = themes[themeName]
                console.log(theme.colors)
                monaco.editor.defineTheme(themeName.replaceAll(/\s+/g, ""), theme)
                monaco.editor.setTheme(themeName.replaceAll(/\s+/g, ""))
                let themeBackgroundColor = theme.colors["editor.background"]
                setBackgroundColor(themeBackgroundColor)
                console.log("Current Theme Colors: ", theme.colors)
            } else {
                if (themeName == "vs-dark") setBackgroundColor("#000")
                if (themeName == "vs-light") setBackgroundColor("#fff")
                monaco.editor.setTheme(themeName)
            }
        }
    }, [themeName]);

    return (
        <div className="w-1/2 font-sans flex flex-col space-y-2 bg-white rounded-md px-12 py-6">
            <p className="font-semibold">Python Code Editor. <br /><span className="text-xs font-normal text-blue-400">Enter your Python code here prior to it being run...</span></p>
            <select onChange={(e) => setThemeName(e.target.value)} className={`decoration-blue-200 selection:border-blue-400  border-2 px-4 py-2 rounded-md`} name="" id="">
                <option className="border-blue-400 border-2" value="vs-light">VS Light</option>
                <option className="border-blue-400 border-2" value="vs-dark">VS Dark</option>
                {themeKeys.map((theme) => (
                    <option className="border-blue-400 border-2" key={`themeChoice${theme}`} value={theme}>{theme}</option>
                ))
                }
            </select>
            <div style={{ backgroundColor: `${backgroundColor}` }} className="h-84 px-4 py-4 rounded-md">
                <Editor
                    height={"100%"}
                    theme="nightowl"
                    defaultLanguage="python"
                    value={pythonCode}
                    onChange={(val: string | undefined) => {
                        if (!val) return
                        setPythonCode(val)
                    }}
                />
            </div>
            <div className="flex gap-x-2 items-center">
                <label className="flex items-center cursor-pointer relative">
                    <input type="checkbox" onChange={(e) => {
                        setEvaluateCode(e.target.checked)
                    }} checked={evaluateCode} className={`peer appearance-none w-4 h-4 ring-transparent border rounded border-slate-200 bg-slate-100 ring-2 checked:bg-blue-500 focus:ring-blue-100`} name="" id="" />
                    <span className="absolute text-white opacity-0 peer-checked:opacity-100 top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor" stroke="currentColor" strokeWidth="1">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path>
                        </svg>
                    </span>
                </label>
                <p className="text-blue-400">
                    Evaluate as Expression
                </p>
            </div>
            <div className="flex gap-x-2 items-end">
                <button disabled={processingCode} onClick={(e) => {
                    sendPythonRequest(pythonCode)
                }} className={`px-4 py-2 cursor-pointer disabled:bg-gray-300 hover:bg-blue-300 duration ease-in-out transition bg-blue-200 rounded-md`}>
                    Run Code
                </button>
            </div>
        </div>
    )
}