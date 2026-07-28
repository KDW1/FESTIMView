import { Binding } from "@/app/page";
import { FESTIMSetting, FESTIMSim, customClasses, populateBindings } from "@/utils/simulations"
import { faDownload, faEraser, faFile, faSave } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import React, { ChangeEvent, JSX, JSXElementConstructor, useEffect, useRef, useState } from "react"

type FESTIMCodePromptsProps = {
    simulation: FESTIMSim;
    updateBindings: Function;
    currentIndex: number;
    setCurrentIndex: Function;
    bindings: Binding[];
    sendPythonRequest: Function;
    postProcessingDone: boolean;
    processingCode: boolean
}

const getBindingName = (setting: FESTIMSetting) => {
    return setting.itemName ?? setting.name ?? setting.title
}
const DEBUGGING_LISTS = false
function InputList({ processingCode, setting, list, bindings, updateBindings, currentIndex }: { processingCode: boolean, setting: FESTIMSetting, list: any[], bindings: Binding[], updateBindings: Function, currentIndex: number }) {
    const [correspondingList, setCorrespondingList] = useState(list)

    const correspondingField = (classSetting: FESTIMSetting, index: number, prefix: string = "", suffix: string = "") => {
        // The custom binding function is for the case of classes or lists that have different functinos
        let indexedBinding = bindings[currentIndex]

        const getBindingOfSetting = (classSetting: FESTIMSetting) => {
            let list = indexedBinding.values[setting.name]
            if (DEBUGGING_LISTS) console.log("Indexed Binding: ", indexedBinding)
            let indexedObject = list[index]
            if (DEBUGGING_LISTS) console.log(`Indexed Object for index ${index}`, indexedObject)
            let binding = prefix + getBindingName(classSetting) + suffix
            return binding in indexedObject ? indexedObject[binding] : ""
        }

        const eventHandler = (e: ChangeEvent<any, any>, classSetting: FESTIMSetting) => {
            let list = [...indexedBinding.values[setting.name]]
            let indexedObject = list[index]
            let binding = prefix + getBindingName(classSetting) + suffix
            const inputType = e.target.type

            if (inputType == "checkbox") {
                if (DEBUGGING_LISTS) console.log("Checked Value: ", e.target.checked)
                indexedObject[binding] = e.target.checked ? "True" : "False"
            } else {
                if (e.target.value == "") {
                    delete indexedObject[binding]
                } else {
                    indexedObject[binding] = e.target.value
                }
            }

            updateBindings(setting.name, list)

            let form: HTMLFormElement = document.getElementById("formStep")
            let validity = form.checkValidity()
            updateBindings("valid", validity)
        }

        const fieldOfType = (setting: FESTIMSetting) => {
            // Assign values to what they are associated with in the binding, if they are bound to
            switch (setting.type) {
                case "string":
                    return (
                        <input required={true} value={getBindingOfSetting(classSetting) ?? ""} key={`item${classSetting.title}${currentIndex}`} onChange={(e) => eventHandler(e, classSetting)} placeholder="abc..." type="text" className="input" />
                    )
                case "number":
                    return (
                        <input required={true} value={getBindingOfSetting(classSetting) ?? ""} key={`item${classSetting.title}${currentIndex}`} onChange={(e) => eventHandler(e, classSetting)} placeholder="0.0" step={0.1} type="number" className="input" />
                    )
                case "boolean":
                    return (
                        <input required={true} checked={getBindingOfSetting(setting) ?? ""} value={getBindingOfSetting(classSetting) ?? ""} key={`item${classSetting.title}${currentIndex}`} onChange={(e) => eventHandler(e, classSetting)} className="mr-auto w-4 h-auto" type="checkbox" name="" id="" />
                    )
                case "enum":
                    return (
                        <select required={true} value={getBindingOfSetting(classSetting) ?? ""} onChange={(e) => eventHandler(e, classSetting)} className="select-container" name="" id="">
                            <option value={""} className="border-blue-400 border-2" >Select a value</option>
                            {classSetting.options && classSetting.options.map((option, i) => (
                                <option className="border-blue-400 border-2" value={option} key={`item${classSetting.title}${currentIndex}${option}`}>{option}</option>
                            ))
                            }
                        </select>
                    )
                default:
                    if (classSetting.type in customClasses) {
                        return (
                            <div className="flex flex-col gap-y-2">
                                {customClasses[classSetting.type].filter(classProperty => !(classSetting.propertiesToExclude ?? []).includes(classProperty.name)).map(classProperty => (
                                    <div key={`${classProperty.title}`} className="flex flex-col">
                                        <p className="text-sm">
                                            {classProperty.title}{classProperty.description && <em>, {classProperty.description}</em>}
                                        </p>
                                        {correspondingField(classProperty, index, `${setting.itemName ?? setting.type}${prefix}.`, suffix)}
                                    </div>
                                ))}
                            </div>)
                    } else {
                        return (<p className="italic text-primarybg">Working on developing that type...</p>)
                    }
            }
        }

        return fieldOfType(classSetting)
    }

    return (list &&
        <div className="flex flex-col gap-y-2">
            <div className="flex gap-x-2">
                <button onClick={() => {
                    // let newIndex = indices[indices.length - 1] + 1
                    // setIndices([...indices, newIndex])

                    let indexedBinding = bindings[currentIndex]
                    let list = indexedBinding.values[setting.name]
                    let longerList = [...list, {}]
                    // Making that new space for the new array item
                    updateBindings(setting.name, longerList)
                    setCorrespondingList(longerList)
                }} className="button">
                    Add
                </button>
                <button onClick={() => {
                    // setIndices(indices.slice(0, indices.length - 1))

                    let indexedBinding = bindings[currentIndex]
                    let list = indexedBinding.values[setting.name]
                    let shortenedList = [...list.slice(0, list.length - 1)]

                    updateBindings(setting.name, shortenedList)
                    setCorrespondingList(shortenedList)
                }} disabled={correspondingList.length <= 1} className="button">
                    Remove
                </button>
            </div>
            {list.map((el: any, i: number) => (
                <div key={`item${i}`}>
                    <p className="font-semibold">{setting.type[0].toUpperCase() + setting.type.slice(1)} {i + 1}</p>
                    {/* Note that here we don't have any recursive lists */}
                    {correspondingField({ ...setting, list: false }, i)}
                </div>
            ))}
        </div>
    )
}

export default function FESTIMCodePrompts({ simulation, processingCode, postProcessingDone, sendPythonRequest, updateBindings, bindings, currentIndex, setCurrentIndex }: FESTIMCodePromptsProps) {
    // This will be a dictionary of bindings corresponding to each step!

    // FESTIM API Reference for FESTIM classes
    // https://festim.readthedocs.io/en/latest/api/index.html
    const [currentStep, setCurrentStep] = useState(simulation.steps[currentIndex])
    const [selectingStep, setSelectingStep] = useState(false)
    const [alerts, setAlerts] = useState([""])
    const [showAlert, setShowAlert] = useState(false)

    const stepNames = simulation.steps.map(s => s.title)

    const validityCheck = (bindings: Binding[]) => {
        console.log("Bindings: ", bindings)
        let stepsArray = bindings.map(b => ({
            valid: b.valid,
            title: b.title
        }))
        return [stepsArray, stepsArray.every(step => step.valid)]
    }

    const correspondingField = (setting: FESTIMSetting, prefix: string = "", suffix: string = "") => {
        // The custom binding function is for the case of classes or lists that have different functinos
        let indexedBinding = bindings[currentIndex]

        const getBindingOfSetting = (setting: FESTIMSetting) => {
            return indexedBinding.values[prefix + getBindingName(setting) + suffix]
        }
        const eventHandler = (e: ChangeEvent<any, any>, setting: FESTIMSetting) => {
            let inputType = e.target.type
            let newValue = ""
            if (inputType == "checkbox") {
                console.log("Checked Value: ", e.target.checked)
                newValue = e.target.checked ? "True" : "False"
            } else {
                newValue = e.target.value
            }
            updateBindings(prefix + getBindingName(setting) + suffix, newValue)

            // Pay attentition to form validity so we can evaluate this prior to running
            // let form: HTMLFormElement = document.getElementById("formStep")
            // let validity = form.checkValidity()
            // updateBindings("valid", validity)
        }

        const fieldOfType = (type: string) => {
            // Assign values to what they are associated with in the binding, if they are bound to
            switch (setting.type) {
                case "string":
                    return (
                        <input required={true} value={getBindingOfSetting(setting) ?? ""} key={`${prefix}${setting.title}${currentIndex}${suffix}`} onChange={(e) => eventHandler(e, setting)} placeholder="abc..." type="text" className="input" />
                    )
                case "number":
                    return (
                        <input required={true} value={getBindingOfSetting(setting) ?? ""} key={`${prefix}${setting.title}${currentIndex}${suffix}`} onChange={(e) => eventHandler(e, setting)} placeholder="0.0" step={0.1} type="number" className="input" />
                    )
                case "boolean":
                    return (
                        <input required={true} checked={getBindingOfSetting(setting) ?? ""} value={getBindingOfSetting(setting) ?? ""} key={`${prefix}${setting.title}${currentIndex}${suffix}`} onChange={(e) => eventHandler(e, setting)} className="mr-auto w-4 h-auto" type="checkbox" name="" id="" />
                    )
                case "enum":
                    return (
                        <select required={true} value={getBindingOfSetting(setting) ?? ""} onChange={(e) => eventHandler(e, setting)} className="select-container" name="" id="">
                            <option value={""} className="border-blue-400 border-2" >Select a value</option>
                            {setting.options && setting.options.map((option, i) => (
                                <option className="border-blue-400 border-2" value={option} key={`${prefix}${setting.title}${option}${suffix}`}>{option}</option>
                            ))
                            }
                        </select>
                    )
                case "run":
                    return (
                        <div className="flex flex-col gap-y-2">
                            <button disabled={processingCode} onClick={async (e) => {
                                e.preventDefault()
                                let [stepsArray, allFormsValid] = validityCheck(bindings)
                                if (allFormsValid) {
                                    await sendPythonRequest(null, true)
                                } else {
                                    let threshold = 4
                                    let unvalidatedSteps = []

                                    for (let step of stepsArray) {
                                        if (!step.valid) unvalidatedSteps.push(step)
                                    }

                                    setShowAlert(true)
                                    if (unvalidatedSteps.length > threshold) {
                                        setAlerts([`${unvalidatedSteps.length} steps are incomplete!`])
                                    } else {
                                        let out = unvalidatedSteps.map(step => `"${step.title}" step is not complete`)
                                        setAlerts(out)
                                    }

                                    setTimeout(() => {
                                        setShowAlert(false)
                                    }, 3000)

                                    setTimeout(() => {
                                        setAlerts([])
                                    }, 3500);
                                }
                                console.log(bindings)
                            }} className={`px-2 py-1 cursor-pointer disabled:cursor-not-allowed disabled:bg-gray-300 hover:bg-primarybg duration-300 ease-in-out transition bg-lightbg rounded-md`}>
                                Run Code
                            </button>
                            <button disabled={processingCode || !postProcessingDone} onClick={async (e) => {
                                e.preventDefault()
                                let [stepsArray, allFormsValid] = validityCheck(bindings)
                                if (allFormsValid) {
                                    let downloadURL = await sendPythonRequest(null, false, true)
                                    if (downloadURL) {
                                        let link = document.createElement("a")
                                        link.href = downloadURL
                                        link.download = "paraview_exports.zip"
                                        link.click()
                                        link.remove()
                                    }
                                } else {
                                    let threshold = 4
                                    let unvalidatedSteps = []

                                    for (let step of stepsArray) {
                                        if (!step.valid) unvalidatedSteps.push(step)
                                    }

                                    setShowAlert(true)
                                    if (unvalidatedSteps.length > threshold) {
                                        setAlerts([`${unvalidatedSteps.length} steps are incomplete!`])
                                    } else {
                                        let out = unvalidatedSteps.map(step => `"${step.title}" step is not complete`)
                                        setAlerts(out)
                                    }

                                    setTimeout(() => {
                                        setShowAlert(false)
                                    }, 3000)

                                    setTimeout(() => {
                                        setAlerts([])
                                    }, 3500);
                                }
                                console.log(bindings)
                            }} className={`px-2 py-1 cursor-pointer disabled:cursor-not-allowed disabled:bg-gray-300 hover:bg-primarybg duration-300 ease-in-out transition bg-lightbg rounded-md`}>
                                Download .ZIP File of Exports
                            </button>
                        </div>
                    )
                default:
                    if (setting.type in customClasses) {
                        return (
                            <div className="flex flex-col gap-y-2">
                                {customClasses[setting.type].map(classSetting => (
                                    <div key={`${classSetting.title}`} className="flex flex-col">
                                        <p className="text-sm">
                                            {classSetting.title}{classSetting.description && <em>, {classSetting.description}</em>}
                                        </p>
                                        {correspondingField(classSetting, `${setting.type}${prefix}.`, suffix)}
                                    </div>
                                ))}
                            </div>)
                    } else {
                        return (<p className="italic text-primarybg">Working on developing that type...</p>)
                    }
            }
        }

        return fieldOfType(setting.type)
    }

    const changeToStep = (stepIndex: number) => {
        setCurrentIndex(stepIndex)
        setCurrentStep(simulation.steps[stepIndex])
        setSelectingStep(false)
    }

    useEffect(() => {
        setCurrentStep(simulation.steps[currentIndex])
    }, [currentIndex, simulation])
    return (
        <div className="text-primary h-4/5 overflow-y-auto flex flex-1 gap-2 flex-col text-base">
            {
                selectingStep ?
                    <select value={stepNames[currentIndex]} onChange={(e) => {
                        let selectIndex = stepNames.indexOf(e.target.value)
                        changeToStep(selectIndex)
                    }} name="" id="" className="select-container">
                        {stepNames.map(step => (
                            <option key={`stepOption${step}`} value={step} className="select-option">{step}</option>
                        ))}
                    </select> :
                    <p onDoubleClick={(e) => {
                        setSelectingStep(true)
                    }} className="group">
                        <span className="font-semibold cursor-pointer">{currentStep.title}</span>
                        <span className="opacity-0 group-hover:opacity-100 text-xs duration-300 ease-in-out transition-all"> double click to select a step</span>
                    </p>
            }
            {currentStep.description && <p className="italic text-xs mb-2">{currentStep.description}</p>}
            <form id="formStep" className="gap-4 min-h-20 flex-col flex flex-1 overflow-y-auto pr-2">
                {
                    currentStep.settings.map((setting, i) => (
                        <div key={`setting${i}`} className="flex flex-col">
                            <p className="text-sm">
                                {setting.title}
                            </p>
                            {setting.description && <p className="text-sm italic">
                                {setting.description}
                            </p>}
                            {setting.list ? <InputList processingCode={processingCode} list={bindings[currentIndex].values[setting.name]} currentIndex={currentIndex} updateBindings={updateBindings} bindings={bindings} setting={setting}></InputList> : correspondingField(setting)}
                        </div>
                    ))
                }
            </form>
            <p className={`text-sm text-rose-600 transition-all duration-300 ease-in-out ${showAlert ? "opacity-100" : "opacity-0"}`}>{alerts.map((alert, i) => <span key={`span${i}`}>{alert} <br /></span>)}</p>
            <div className="flex flex-row mt-auto space-x-2">
                <button onClick={(e) => {
                    e.target.disabled = true
                    let bindingObject = bindings.map((b) => {
                        return { values: b.values }
                    })
                    let bindingDictionary: any = JSON.parse(localStorage.getItem("bindings") ?? "{}")
                    bindingDictionary[simulation.title] = bindingObject
                    localStorage.setItem("bindings", JSON.stringify(bindingDictionary))
                    setTimeout(() => {
                    e.target.disabled = false
                }, 750)
                }} className="button mt-auto group tooltip-container">
                <span className="tooltip">Save Settings</span>
                <FontAwesomeIcon className="text-base" icon={faSave}></FontAwesomeIcon>
            </button>
            <button onClick={(e) => {
                e.target.disabled = true
                let bindingDictionary: any = JSON.parse(localStorage.getItem("bindings") ?? "{}")
                delete bindingDictionary[simulation.title]
                localStorage.setItem("bindings", JSON.stringify(bindingDictionary))
                updateBindings("*", populateBindings(simulation, {}, true))
                setTimeout(() => {
                    e.target.disabled = false
                }, 750)
            }} className="button mt-auto group tooltip-container">
                <span className="tooltip">Reset Settings and Clear Save</span>
                <FontAwesomeIcon className="text-base" icon={faEraser}></FontAwesomeIcon>
            </button>
            <button onClick={(e) => {
                e.target.disabled = true
                let fileUploadInput = document.createElement("input")
                fileUploadInput.type = "file"
                fileUploadInput.accept = ".json"
                fileUploadInput.click()
                fileUploadInput.addEventListener("change", (e) => {
                    console.log(e.target.files)
                    let file = e.target.files[0]
                    if (file) {
                        const reader = new FileReader()
                        reader.onload = () => {
                            let jsonContent = reader.result
                            console.log("Parsed JSON Content: ", JSON.parse(jsonContent))
                            let bindings = populateBindings(simulation, JSON.parse(jsonContent))
                            console.log(bindings)
                            updateBindings("*", bindings)
                        }
                        reader.readAsText(file)
                    }
                })
                e.target.disabled = false
            }} className="button mt-auto group tooltip-container">
                <span className="tooltip">Upload Settings from .JSON</span>
                <FontAwesomeIcon className="text-base" icon={faDownload}></FontAwesomeIcon>
            </button>
            <button onClick={(e) => {
                e.target.disabled = true
                let a = document.createElement("a")
                let link = new Blob([JSON.stringify(bindings.map((b) => {
                    return { values: b.values }
                }))], { type: "application/json" })
                a.href = URL.createObjectURL(link)
                let date = new Date()
                a.download = `${simulation.title.replaceAll(" ", "_").toLocaleLowerCase()}_settings_${date.toLocaleDateString()}`
                a.click()
                e.target.disabled = false
            }} className="button mt-auto group tooltip-container">
                <span className="tooltip">Save Settings as .JSON</span>
                <FontAwesomeIcon className="text-base" icon={faFile}></FontAwesomeIcon>
            </button>
            <div className="flex gap-2 h-min overflow-x-auto mt-auto">
                {
                    currentIndex != 0 &&
                    <button onClick={() => {
                        let previousIndex = currentIndex - 1
                        changeToStep(previousIndex)
                    }} className="button">
                        Previous
                    </button>
                }
                {
                    currentIndex != simulation.steps.length - 1 &&
                    <>
                        <button onClick={() => {
                            let nextIndex = currentIndex + 1
                            changeToStep(nextIndex)
                        }} className="button">
                            Next
                        </button>
                        <button onClick={() => {
                            let lastIndex = simulation.steps.length - 1
                            changeToStep(lastIndex)
                        }} className="button">
                            Skip to Last Step
                        </button>
                    </>
                }
            </div>
        </div>
        </div >
    )
}