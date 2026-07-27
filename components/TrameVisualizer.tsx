import ClientCommunicator from "@kitware/trame-iframe"
import { useEffect, useState } from "react"
import { FESTIMSim, presetSimulations } from "@/utils/simulations"
import FESTIMCodePrompts from "./FESTIMCodePrompts";
import { Binding } from "@/app/page";
import { Play } from "next/font/google";
import { parse } from "path";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faLastfmSquare } from "@fortawesome/free-brands-svg-icons";
import { faBackward, faBackwardFast, faBackwardStep, faCross, faForwardFast, faForwardStep, faPlay, faScrewdriverWrench, faWrench, faX, faXmark } from "@fortawesome/free-solid-svg-icons";
import Image from "next/image";

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
const iframe_url = "http://localhost:5000/iframe"

export default function TrameVisualizer({
  onCommunicatorReady, identifyExportPath, postProcessingFilepath, postProcessingDone, setPostProcessingDone, processingCode, simulation, sendPythonRequest, updateBindings, bindings, mode, updateMode, currentIndex, setCurrentIndex
}: VisualizerProps) {
  const tabs = simulation ? ["Window", "FESTIM"] : ["Window"]
  const [resolution, setResolution] = useState("...")
  const [field, setField] = useState("...")
  const [currentTab, setCurrentTab] = useState(mode)
  const [currentTimeStep, setCurrentTimeStep] = useState(0)
  const [dataInitialized, setDataInitialized] = useState(false)
  const [simulationsMenuVisible, setSimulationsMenuVisible] = useState(false)

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
    let filepath = identifyExportPath(true)
    console.log("Filepath to be read: ", filepath)
    sendMessage({ "action": "downloadData", "filepath": filepath })
  }

  const selectSimulation = (obj: FESTIMSim) => {
    console.log("Selecting simulation: ", obj.title)
  }
  useEffect(() => { console.log("hi") }, [simulationsMenuVisible])
  return (
    <div className="relative w-full flex h-full container text-base text-primary">
      {
        simulationsMenuVisible &&
        <div className="absolute left-0 top-0 w-full h-full container  z-20 bg-primarybg/50!">
          <div className="container w-4/5 h-4/5 m-auto shadow-2xl shadow-blue-500">
            <FontAwesomeIcon onClick={() => setSimulationsMenuVisible(false)} className="ml-auto cursor-pointer hover:text-red-400 ease-in-out duration-300" icon={faXmark}></FontAwesomeIcon>          
            <p className="text-base text-center">Preset Simulations</p>
            <div className="overflow-y-auto py-4 w-full flex-row flex-wrap gap-2 flex flex-1">
              {
                presetSimulations.map((obj, i) => (
                  <div onClick={() => selectSimulation(obj)} key={`simulation${i}`} className="hover:-translate-y-2 ease-in-out duration-300 cursor-pointer w-auto flex flex-col min-w-max h-min min-h-min px-2 py-2  rounded bg-lightbg">
                    <p className="text-base text-primary">{obj.title}</p>
                    <p className="text-sm text-lightprimary">{obj.description}</p>
                    {obj.imageUrl && <Image alt={`Display image for ${obj.title} simulation`} height={1000} width={1000} src={obj.imageUrl} className="rounded mt-4 w-auto h-46"></Image>}
                  </div>
                ))
              }
            </div>
          </div>
        </div>
      }
      <div className="flex flex-row">
        <p className="italic text-sm">{simulation ? simulation.title : "Post Processing Window"}</p>
        <button onClick={() => setSimulationsMenuVisible(true)} className="cursor-pointer group tooltip-container text-primary flex ml-auto gap-2">
          <span className="text-sm">Change Simulation</span>
          <FontAwesomeIcon icon={faScrewdriverWrench} className="text-lg text-gray-300 hover:text-primarybg ease-in-out duration-300" ></FontAwesomeIcon>
        </button></div>
      <div className="flex overflow-x-auto gap-2 text-primary items-center rounded-md">
        {
          tabs.map((tab) =>
          (
            <button key={`option${tab}`} onClick={(e) => {
              e.preventDefault()
              setCurrentTab(tab.toLowerCase())
              if (tab == "Window") loadData()
              updateMode(tab.toLowerCase())
            }} disabled={tab.toLowerCase() == "window" && !postProcessingDone} className={`cursor-pointer disabled:bg-gray-300 ease-in-out duration-300 transition ${tab.toLowerCase() == currentTab ? "bg-primarybg" : "bg-lightbg"} px-2 py-1 rounded-md`}>{tab == "Window" ? "Post Processing Window" : "FESTIM"}</button>
          )
          )
        }
      </div>
      <div className={`flex-col flex flex-1 ${currentTab == "window" ? "" : "hidden h-0"}`}>
        <iframe id={iframe_id} className="h-full w-full" sandbox="allow-scripts allow-same-origin" />
      </div>
      {
        currentTab == "festim" && simulation &&
        <FESTIMCodePrompts sendPythonRequest={sendPythonRequest} processingCode={processingCode} currentIndex={currentIndex} setCurrentIndex={setCurrentIndex} bindings={bindings} updateBindings={updateBindings} simulation={simulation} />
      }
    </div>
  )
}