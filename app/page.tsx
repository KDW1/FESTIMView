"use client"
import PythonCodeEditor from "@/components/PythonCodeEditor";
import PythonConsole, { ConsoleArg } from "@/components/PythonConsole";
import { useEffect, useState } from "react";
import Head from "next/head";
import Image from "next/image";
import TrameVisualizer from "@/components/TrameVisualizer";
import { customClasses, exampleSimulation, FESTIMSetting, FESTIMSim, FESTIMStep, presetSimulations } from "@/utils/simulations";

// TODO: Need to develop some full fledged context for the Python Code Editor in order to avoid prop drilling

export type Binding = {
  index: number,
  valid: boolean,
  name?: string,
  title: string,
  snippet: string,
  values: {
    [key: string]: any
  },
  recipe?: string,
  exporting?: boolean,
  exportAddress?: string
}

const DEBUGGING_PARSER = false

export default function Home() {
  const defaultSimulation: FESTIMSim = presetSimulations[0]

  let initializedBindings = []
  let localStorageBindings = []

  // Note this method of storing bindings locally will change in the future
  // Since I'm pretty sure this isn't reliable

  if (typeof window !== 'undefined' && localStorage.getItem("bindings")) {
    let objects
    try {
      objects = JSON.parse(localStorage.getItem("bindings"))
      // console.log("Objects: ", objects)
    } catch (error) {
      console.log("Error: ", error)
      objects = null
    }
    localStorageBindings = objects
  }
  if (defaultSimulation) {
    for (let i = 0; i < defaultSimulation.steps.length; i++) {
      let step: FESTIMStep = defaultSimulation.steps[i]
      let values: { [key: string]: any } = {}
      let storedBinding = localStorageBindings[i]
      // We initialize the values
      for (let setting of step.settings) {
        let binding = setting.name ?? setting.title
        if (setting.defaultValue || (storedBinding && binding in storedBinding.values)) {
          values[binding] = setting.defaultValue ?? storedBinding.values[binding]
        } else {
          values[binding] = setting.list ? [{}] : ""
        }
      }

      initializedBindings.push({
        index: i,
        name: step.name,
        title: step.title,
        snippet: "",
        values,
        recipe: step.recipe ?? "",
        exporting: step.exporting ?? false,
        exportAddress: step.exportAddress ?? null
      })
    }
  }

  const [postProcessingFilepath, setPostProcessingFilepath] = useState([""])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [postProcessingDone, setPostProcessingDone] = useState(true)
  const [mode, setMode] = useState<"window" | "festim">("festim")
  const [snippetOnly, setSnippetOnly] = useState<boolean>(true)
  const [currentSimulation, setCurrentSimulation] = useState<FESTIMSim | null>(presetSimulations[0])
  const [bindings, setBindings] = useState<Binding[]>(initializedBindings ?? []) // Bindings for selected simulations
  const [args, setArgs] = useState<ConsoleArg[]>([])
  const [processingCode, setProcessingCode] = useState<boolean>(false)
  const [evaluatingCode, setEvaluatingCode] = useState(false)

  const updateArgs = (newArgs: ConsoleArg[]) => {
    setArgs(args => [...args, ...(newArgs.filter(el => el.message))])
  }

  const [pythonCode, setPythonCode] = useState<string>("")

  const updatePythonCode = (code: string) => {
    setPythonCode(code)
  }

  const parseRecipe = (indexedBinding: { values: { [key: string]: any }, recipe: string }) => {
    if (DEBUGGING_PARSER) console.log("Parsing with binding: ", indexedBinding)
    let recipe = indexedBinding.recipe
    let modifiedRecipe = recipe
    
    // We invalidate when a local binding, {**} or $$ is lacking
    // When a page lacks that value we DON'T double-count
    let valid = true

    if (!recipe) return ""

    const tokenize = (recipe: string) => {
      return recipe.replaceAll("{*", "--{*--").replaceAll("*}", "--*}--").replaceAll("$", "--$--").replaceAll(/--{2,}/g, "--").split("--")
    }

    if (DEBUGGING_PARSER) console.log("Tokens: ", tokenize(recipe))

    // Thank you 6.1010 for making us do Symbolic Algebra and LISP Parser
    // Special character for variables
    modifiedRecipe = recipe.replaceAll("{*", "--{*--").replaceAll("*}", "--*}--")
    // Special character for lists
    modifiedRecipe = modifiedRecipe.replaceAll("$", "--$--")
    // Special character for different page variables
    modifiedRecipe = modifiedRecipe.replaceAll("@", "--@--")

    modifiedRecipe = modifiedRecipe.replaceAll(/--{2,}/g, "--")
    let tokens = modifiedRecipe.split("--")

    const parse = (tokens: string[], start: number = 0) => {
      let out: string[] = []
      let currentIndex = start
      while (currentIndex < tokens.length) {
        let token = tokens[currentIndex]
        if (token == "@") {
          // We have "@" + pageName + expression + "@"
          currentIndex += 1 // to page name
          let pageName = tokens[currentIndex]
          let selectedBinding: Binding = bindings.filter(b => b.name == pageName)[0]

          currentIndex += 1 // to expression
          let followingTokens = tokens.slice(currentIndex)
          let closingIndex = currentIndex + followingTokens.indexOf("@")
          let nextIndex = closingIndex + 1 // Skip the closing @

          if (!selectedBinding) {
            // In the case that the binding doesn't exist
            if (DEBUGGING_PARSER) console.log("Page doesn't exist")
            out.push("@")
            out.push(pageName)
            out.push("--")
            const expression = tokens.slice(currentIndex, closingIndex).join("").replaceAll("{*", "{").replaceAll("*}", "}")
            out.push(expression)
            out.push("@")
            if (DEBUGGING_PARSER) console.log(`Encountered step variable, form: @${pageName}--${expression}@`)
            currentIndex = nextIndex
            continue
          }

          let expression = tokens.slice(currentIndex, closingIndex).join("")
          let cleanExpression = expression.replaceAll("{*", "{").replaceAll("*}", "}")
          let [value, expressionValid] = parseRecipe({ values: selectedBinding.values, recipe: expression })

          // console.log("Clean Expression: ", cleanExpression)
          out.push(value != cleanExpression ? value : `@${pageName}--${expression}@`)
          currentIndex = nextIndex
          if (DEBUGGING_PARSER) console.log(`Encountered step variable, form: @${pageName}--${expression}@`)

        } else if (token == "{*") {
          // We have "{*" + variableName + "*}"
          currentIndex += 1 // Set to variable index
          let variableName = tokens[currentIndex]
          let valueExists = (variableName in indexedBinding.values && indexedBinding.values[variableName].toString() != "")
          let value = valueExists ? indexedBinding.values[variableName] : `{${variableName}}`

          if(!valueExists) valid = false

          out.push(value)
          currentIndex += 2

          if (DEBUGGING_PARSER) console.log(`Encountered variable form: {${variableName}}`)
        } else if (token == "$") {
          // We have "$" + binding + expression + "$"
          // x being the separator
          currentIndex += 1 // to binding

          let arrayName = tokens[currentIndex]

          let arrayExists = (arrayName in indexedBinding.values && indexedBinding.values[arrayName] != "")
          currentIndex += 1 // to expression
          let followingTokens = tokens.slice(currentIndex)
          let closingIndex = currentIndex + followingTokens.indexOf("$")
          let nextIndex = closingIndex + 1 // Skip the closing }

          if (!arrayExists || indexedBinding.values[arrayName].every((obj: Object) => Object.keys(obj).length == 0)) {
            valid = false

            // In the case that the binding doesn't exist
            out.push("$")
            out.push(arrayName)
            out.push("--")
            const expression = tokens.slice(currentIndex, closingIndex).join("").replaceAll("{*", "{").replaceAll("*}", "}")
            out.push(expression)
            out.push("$")
            if (DEBUGGING_PARSER) console.log(`Encountered list form: $${arrayName}--${expression}$`)
            currentIndex = nextIndex
            continue
          }

          let arrayBinding = indexedBinding.values[arrayName]
          let expression = tokens.slice(currentIndex, closingIndex).join("")

          let listExpressions = []

          for (let binding of arrayBinding) {
            if (Object.keys(binding).length == 0) continue

            let [parsedExpression, expressionValid] = parseRecipe({ values: binding, recipe: expression })
            if(!expressionValid) valid = false

            listExpressions.push(parsedExpression)
            let nextCharacter = tokens[nextIndex][0]
            let isInline = (nextCharacter == "]" || nextCharacter == "," || nextCharacter == "$")

            if ((nextIndex < tokens.length) && !isInline && arrayBinding.length > 1) {
              listExpressions.push("\n")
            }
          }

          out = out.concat(listExpressions)
          currentIndex = nextIndex

          if (DEBUGGING_PARSER) console.log(`Encountered list form: $${arrayName}--${expression}$`)
        } else {
          out.push(token)
          currentIndex += 1
        }
      }

      return [out, currentIndex]
    }

    let [parsedTokens, next_index] = parse(tokens, 0) as [string[], number]
    if (DEBUGGING_PARSER) console.log("Parsed Recipe: \n", parsedTokens.join(""))
    if(!valid) console.log("This expression is missing some variables...")
    return [parsedTokens.join(""), valid]
  }

  const updateCodeWithIndexedBinding = (indexedBinding: Binding, exclusive: boolean) => {
    if (exclusive) {
      let [parsedRecipe, valid] = parseRecipe(indexedBinding)
      indexedBinding.snippet = parsedRecipe
      indexedBinding.valid = valid
      setPythonCode(parsedRecipe)
    } else {
      let out = []
      for (let binding of bindings) {
        let [parsedRecipe, valid] = parseRecipe(binding)
        binding.snippet = parsedRecipe
        binding.valid = valid
        if (binding.snippet) out.push(binding.snippet)
      }
      let outString = out.join("\n\n")
      if (currentSimulation?.preCode) outString = currentSimulation.preCode + "\n\n" + outString
      if (currentSimulation?.postCode) outString += currentSimulation.postCode
      setPythonCode(outString)
    }
  }

  const identifyExportPath = () => {
    let relevant_filepath = null
    for(let binding of bindings) {
    if(binding.exporting && binding.exportAddress) {
      let exportAddress = binding.exportAddress
      if(exportAddress && exportAddress.includes("$")) {
        let [list, address] = exportAddress.split("$")
        let filepaths = []
        for(let obj of binding.values[list]) {
          filepaths.unshift(obj[address])
        }
        // TODO: THIS SYSTEM BREAKS DOWN IF THERE ARE MULTIPLE EXPORT ADDRESSES, IDK WHAT TO DO THEN
        relevant_filepath = filepaths[0]
        console.log("Post processing filepath(s) are: ", filepaths)
      } else {
        relevant_filepath = binding.values[exportAddress]
        console.log("Post processing filepath is: ", relevant_filepath)
      }
    }
    }
    setPostProcessingFilepath(relevant_filepath)
    return relevant_filepath
  }

  const updateBindings = (binding: string, value: any) => {
    let indexedBinding = bindings[currentIndex]
    indexedBinding.values[binding] = value
    if (indexedBinding.recipe) {
      updateCodeWithIndexedBinding(indexedBinding, snippetOnly)
    }

    let updatedBindings = [...bindings]
    updatedBindings[currentIndex] = indexedBinding
    setBindings(updatedBindings)
    console.log("Updated Bindings: ", updatedBindings)
  }


  // Python Code Evaluation
  const sendPythonRequest = async (code?: string, postprocessing?: boolean) => {
    let filepath = null
    if (!code) code = pythonCode
    setProcessingCode(true)
    if (!postprocessing) {
      updateArgs([{
        message: evaluatingCode ? "Evaluating your expression..." : "Executing code...",
        status: "info"
      }])
    } else {
      updateArgs([{
        message: "Preparing export file...",
        status: "notification"
      }])
      filepath = identifyExportPath()
    }
    
    let apiURL = evaluatingCode ? "/api/eval" : "/api/exec"
    try {
      let res = await fetch(apiURL, {
        method: "POST",
        body: JSON.stringify({
          code,
          postprocessing,
          filepath
        }),
        headers: {
          "Content-Type": "application/json"
        }
      })

      if (!postprocessing) {
        let data = await res.json()
        console.log("Data: ", data)

        if (data.error) {
          updateArgs([{
            message: data.error,
            status: "error"
          }])
        } else {
          console.log(`Data from ${apiURL},`, data)
          if (evaluatingCode) {
            updateArgs([{
              message: "Successfully evaluated code...",
              status: "info"
            }])
            updateArgs([{
              message: data.result,
              status: "evaluation"
            }, {
              message: data.output,
              status: "output"
              ,
            }])
          } else {
            updateArgs([{
              message: "Successfully executed code...",
              status: "info"
            }])
            updateArgs([{
              message: data.output,
              status: "output"
            }])
          }
        }
      } else {
        let contentType = res.headers.get("Content-Type")
        console.log("Content-Type: ", contentType)
        if (contentType == "application/json") {
          // Whenever we get a JSON response something has gone wrong...
          let data = await res.json()
          if (data.error) {
            updateArgs([{
              message: data.error,
              status: "error"
            }])
          } else {
            updateArgs([{
              message: "Something went wrong...",
              status: "error"
            }])
          }
          setProcessingCode(false)
          return
        }

        try {
          let blob = await res.blob()
          let downloadURL = URL.createObjectURL(blob)

          updateArgs([{
            message: "Sending .zip file",
            status: "notification"
          }])
          setProcessingCode(false)
          setPostProcessingDone(true)
          return downloadURL
        } catch (error) {
          updateArgs([{
            message: `Error: ${error}`,
            status: "error"
          }])
          setProcessingCode(false)
          return null
        }
      }
    } catch (error) {
      const errorMessage = `Failed to send the request Python code snippet to ${apiURL}`
      console.log(error)
      console.log(errorMessage)
      updateArgs([{
        message: errorMessage,
        status: "error"
      }])
    }
    setProcessingCode(false)

  }


  useEffect(() => {
    if (mode == "festim") {
      console.log(bindings.length)
      console.log("Current Index: ", currentIndex)
      let snippetVisibility = true
      if (currentIndex == bindings.length - 1) {
        console.log("We've reached the last step")
        setSnippetOnly(false)
        snippetVisibility = false
      } else {
        setSnippetOnly(true)
      }
      let indexedBinding = bindings[currentIndex]
      if (indexedBinding) {
        updateCodeWithIndexedBinding(indexedBinding, snippetVisibility)
      }
    }
  }, [currentIndex, mode])

  return (
    <div className="h-screen bg-primarybg px-16 py-8">
      <main className="relative w-full h-full overflow-y-clip mx-auto flex flex-row gap-4">
        <div className="w-2/3 h-full flex flex-col flex-1 relative">
          <PythonCodeEditor sendPythonRequest={sendPythonRequest} setEvaluatingCode={setEvaluatingCode} evaluatingCode={evaluatingCode} processingCode={processingCode} setProcessingCode={setProcessingCode} snippetOnly={snippetOnly} setSnippetOnly={(value: boolean) => {
            setSnippetOnly(value)
            let indexedBinding = bindings[currentIndex]
            updateCodeWithIndexedBinding(indexedBinding, value)
          }} mode={mode} pythonCode={pythonCode} updatePythonCode={updatePythonCode} args={args} updateArgs={updateArgs} />
        </div>
        <div className="w-1/3 flex flex-col gap-4">
          <div className="flex flex-1 h-4/5">
            <TrameVisualizer identifyExportPath={identifyExportPath} postProcessingFilepath={postProcessingFilepath} postProcessingDone={postProcessingDone} setPostProcessingDone={setPostProcessingDone} processingCode={processingCode} sendPythonRequest={sendPythonRequest} mode={mode} currentIndex={currentIndex} setCurrentIndex={(index: number) => setCurrentIndex(index)} updateMode={(mode: "window" | "festim") => setMode(mode)} bindings={bindings} updateBindings={updateBindings} simulation={currentSimulation} />
          </div>
          <PythonConsole args={args} />
        </div>
      </main>
    </div>
  );
}
