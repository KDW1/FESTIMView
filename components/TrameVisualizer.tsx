import ClientCommunicator from "@kitware/trame-iframe"
import { useEffect, useState } from "react"
import { FESTIMSim } from "@/utils/simulations"
import FESTIMCodePrompts from "./FESTIMCodePrompts";
import { Binding } from "@/app/page";
import { Play } from "next/font/google";
import { parse } from "path";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faLastfmSquare } from "@fortawesome/free-brands-svg-icons";
import { faBackward, faBackwardFast, faBackwardStep, faForwardFast, faForwardStep, faPlay } from "@fortawesome/free-solid-svg-icons";

// Entire structre is copied from trame-react since legacy dependencies with
// react-scripts, react-dom is preventing the package from functioning normally

type VisualizerProps = {
  identifyExportPath: Function;
  simulation?: FESTIMSim;
  updateBindings: Function;
  updateMode: Function;
  onCommunicatorReady: (communicator: unknown) => void;
  mode: "festim" | "window";
  bindings: Binding[];
  postProcessingFilepath: string;
  postProcessingDone: any;
  setPostProcessingDone: Function;
  currentIndex: number;
  setCurrentIndex: Function;
  sendPythonRequest: Function;
  processingCode: boolean;
};

const iframe_id = "my_frame"
const iframe_url = "http://localhost:8080"

export default function TrameVisualizer({
  onCommunicatorReady, identifyExportPath, postProcessingFilepath, postProcessingDone, setPostProcessingDone, processingCode, simulation, sendPythonRequest, updateBindings, bindings, mode, updateMode, currentIndex, setCurrentIndex
}: VisualizerProps) {
  const tabs = simulation ? ["Window", "FESTIM"] : ["Window"]
  const [resolution, setResolution] = useState("...")
  const [field, setField] = useState("...")
  const [currentTab, setCurrentTab] = useState(mode)
  const [currentTimeStep, setCurrentTimeStep] = useState(0)
  const [dataInitialized, setDataInitialized] = useState(false)

  // Hard coded variables until I can figure out the reverse proxy...
  const STEP = 1
  const MAX_STEP = 2.00 / 0.05 - 1
  const ANIMATION_INTERVAL = 50

  let listeners: Array<(e: Event) => void> = [];
  let iframeClientCommunicator: unknown = null;
  let iframe: HTMLElement | null = null;

  onCommunicatorReady = (communicator: ClientCommunicator) => {
    communicator.state.onReady(() => {
      console.log("Communicator ready...")
      communicator.state.watch(['resolution'], (e) => {
        console.log("There was a change")
        console.log("Field Options: ", e)
        setResolution(e)
      })
    })
  }

  useEffect(() => {
    console.log("Mounting trame visualizer component....")
    let iframe = document.getElementById(iframe_id);

    if (iframe == null) {
      throw new Error(`iframe ${iframe_id} not found`);
    }

    const createClientCommunicator = () => {
      let iframeClientCommunicator = new ClientCommunicator(iframe, iframe_url);
      onCommunicatorReady(iframeClientCommunicator);
      console.log("Creating client commuicator")
    };

    listeners.push(createClientCommunicator);
    console.log("Iframe: ", iframe)
    iframe.addEventListener('load', createClientCommunicator);
    iframe.setAttribute("src", iframe_url)
    console.log("Set src of iframe...")
    return function unmount() {
      console.log("Unmounting the client communicator")
      if (iframe) {
        listeners.forEach((l) => iframe.removeEventListener('load', l));
      }

      listeners = [];

      if (iframeClientCommunicator) {
        iframeClientCommunicator.cleanup();
      }
    };
  }, [])

  const sendMessage = (value: { [key: string]: any }) => {
    let iframe = document.getElementById(iframe_id)
    if ("time" in value) {
      setCurrentTimeStep(value["time"])
    }
    if (value["action"] == "downloadData") {
      setDataInitialized(true)
    }
    iframe.contentWindow.postMessage({
      emit: "parent-to-child",
      value
    }, "*")
  }
  const loadData = () => {
    setField("Solid (default)")
    let filepath = identifyExportPath()
    console.log("Filepath to be read: ", filepath)
    sendMessage({ "action": "downloadData", "filepath": filepath })
  }

  const toLastFrame = () => sendMessage({ "action": "toFrame", "time": MAX_STEP })

  const toFirstFrame = () => sendMessage({ "action": "toFrame", "time": 0 })

  const playThroughFrames = (e: Event, direction: number = 1) => {
    e.preventDefault()
    if (direction == 1) {
      for (let i = 0; i < MAX_STEP + 1; i++) {
        setTimeout(() => {
          sendMessage({ "action": "toFrame", "time": i })
          setCurrentTimeStep(i)
        }, ANIMATION_INTERVAL * i)
      }
    } else {
      for (let i = 0; i < MAX_STEP + 1; i++) {
        setTimeout(() => {
          sendMessage({ "action": "toFrame", "time": MAX_STEP - 1 - i })
          setCurrentTimeStep(MAX_STEP - i)
        }, ANIMATION_INTERVAL * i)
      }
    }
    // direction == 1 ? sendMessage({"action": "play"}) : sendMessage({"action": "reversePlay"})
  }

  const toPreviousFrame = () => sendMessage({ "action": "toFrame", "time": currentTimeStep - STEP >= 0 ? currentTimeStep - STEP : 0 })

  const toNextFrame = () => sendMessage({ "action": "toFrame", "time": currentTimeStep + STEP <= MAX_STEP ? currentTimeStep + STEP : MAX_STEP })

  const switchFieldOption = (e: Event) => {
    let optionValue = e.target.value
    setField(optionValue)
    sendMessage({ "action": "switchFieldOption", "option": optionValue })
  }
  return (
    <div className="w-full flex h-full container text-base text-primary">
      <p className="italic text-sm">{simulation ? simulation.title : "Post Processing Window"}</p>
      <div className="flex overflow-x-auto gap-2 text-primary items-center rounded-md">
        {
          tabs.map((tab) =>
          (
            <button key={`option${tab}`} onClick={(e) => {
              e.preventDefault()
              setCurrentTab(tab.toLowerCase())
              updateMode(tab.toLowerCase())
            }} disabled={tab.toLowerCase() == "window" && !postProcessingDone} className={`cursor-pointer disabled:bg-gray-300 ease-in-out duration-300 transition ${tab.toLowerCase() == currentTab ? "bg-primarybg" : "bg-lightbg"} px-2 py-1 rounded-md`}>{tab == "Window" ? "Post Processing Window" : "FESTIM"}</button>
          )
          )
        }
      </div>
      <div className={`flex-col flex flex-1 ${currentTab == "window" ? "" : "hidden h-0"}`}>
        <div className="flex flex-wrap gap-2 pb-4 my-2">
          {!dataInitialized && <button className="button" onClick={loadData}>Load Data</button>}
          {
            dataInitialized && <div className="w-full">
            <div className="flex gap-x-2 mb-1">
              <button className="button font-thin h-min" onClick={toFirstFrame}><FontAwesomeIcon icon={faBackwardFast} /></button>
              <button className="button font-thin h-min" onClick={toPreviousFrame}><FontAwesomeIcon icon={faBackwardStep} /></button>
              <button className="button font-thin h-min" onClick={(e) => playThroughFrames(e, -1)}><FontAwesomeIcon icon={faBackward} /></button>
              <button className="button font-thin h-min" onClick={playThroughFrames}><FontAwesomeIcon icon={faPlay} /></button>
              <button className="button font-thin h-min" onClick={toNextFrame}><FontAwesomeIcon icon={faForwardStep} /></button>
              <button className="button font-thin h-min" onClick={toLastFrame}><FontAwesomeIcon icon={faForwardFast} /></button>
              
            </div><div className="flex flex-col text-sm gap-y-1 font-semibold text-primary">
                <p>Field Options: </p>
                <select value={field} onChange={switchFieldOption} name="" id="" className="select-container">
                  <option defaultValue={true}>Select a Value</option>
                  <option value="H_1">H_1</option>
                  <option value="H_trapped_1">H_trapped_1</option>
                  <option value="empty_trap_1">empty_trap_1</option>
                </select>
                <p className="font-normal text-primary text-base">({currentTimeStep + 1}/{MAX_STEP + 1}), t = <span className="font-semibold">{(Math.round(100 * ((currentTimeStep) * 0.05 + 0.05)) / 100).toPrecision(3)}</span> seconds</p>
                <input onChange={(e) => {
                  let t = parseInt(e.target.value)
                  setCurrentTimeStep(t)
                  sendMessage({ action: "toFrame", time: t })
                }} className="bg-gray-200 stroke-amber-200" type="range" min={0} value={currentTimeStep} max={MAX_STEP} step={1} name="" id="" />
              </div>
              </div>
          }
        </div>
        {/* <p className="font-semibold text-primary text-base">Resolution: <span className="font-normal">{resolution}</span></p> */}
        <iframe id={iframe_id} className="h-full w-full" />
      </div>
      {
        currentTab == "festim" && simulation &&
        <FESTIMCodePrompts sendPythonRequest={sendPythonRequest} processingCode={processingCode} currentIndex={currentIndex} setCurrentIndex={setCurrentIndex} bindings={bindings} updateBindings={updateBindings} simulation={simulation} />
      }
    </div>
  )
}