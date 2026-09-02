import { FESTIMSim } from "@/utils/simulations"
import FESTIMCodePrompts from "./FESTIMCodePrompts";
import { Binding } from "@/app/page";
import { Play } from "next/font/google";
import { parse } from "path";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faLastfmSquare } from "@fortawesome/free-brands-svg-icons";
import { faBackward, faBackwardFast, faBackwardStep, faCross, faForwardFast, faForwardStep, faPlay, faScrewdriverWrench, faWrench, faX, faXmark } from "@fortawesome/free-solid-svg-icons";
import Image from "next/image";
import SimulationsMenu from "./SimulationsMenu";

type VisualizerProps = {
  identifyExportPath: Function;
  simulation?: FESTIMSim;
  updateBindings: Function;
  updateMode: Function;
  onCommunicatorReady?: (communicator: unknown) => void;
  mode: "festim" | "window";
  bindings: Binding[];
  postProcessingFilepath: string;
  postProcessingDone: any;
  setPostProcessingDone: Function;
  currentIndex: number;
  setCurrentIndex: Function;
  sendPythonRequest: Function;
  processingCode: boolean;
  setSimulationsMenuVisible: Function;
};

export default function TrameVisualizer({
  onCommunicatorReady, identifyExportPath, setSimulationsMenuVisible, postProcessingFilepath, postProcessingDone, setPostProcessingDone, processingCode, simulation, sendPythonRequest, updateBindings, bindings, mode, updateMode, currentIndex, setCurrentIndex
}: VisualizerProps) {
  const tabs = simulation ? ["Window", "FESTIM"] : ["Window"]
  
  const IFRAME_ID = "my_frame"
  // const IFRAME_URL = process.env.NEXT_PUBLIC_TRAME_DOMAIN

  const sendMessage = (value: { [key: string]: any }) => {
    let iframe: HTMLIFrameElement = document.getElementById(IFRAME_ID) as HTMLIFrameElement
    if (iframe && iframe.contentWindow) iframe.contentWindow.postMessage({
      emit: "parent-to-child",
      value
    }, "*")
  }
  const loadData = () => {
    let filepath = identifyExportPath(true)
    console.log("Filepath to be read: ", filepath)
    sendMessage({ "action": "downloadData", "filepath": filepath })
  }

  return (
    <div className="relative w-full flex h-full container text-base text-primary">
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
              updateMode(tab.toLowerCase() as "festim" | "window")
              if (tab == "Window") loadData()
              updateMode(tab.toLowerCase())
            }} disabled={tab.toLowerCase() == "window" && !postProcessingDone} className={`cursor-pointer disabled:bg-gray-300 ease-in-out duration-300 transition ${tab.toLowerCase() == mode ? "bg-primarybg" : "bg-lightbg"} px-2 py-1 rounded-md`}>{tab == "Window" ? "Post Processing Window" : "FESTIM"}</button>
          )
          )
        }
      </div>
      <div className={`flex-col flex flex-1 ${mode == "window" ? "" : "hidden h-0"}`}>
        {process.env.NEXT_PUBLIC_TRAME_DOMAIN}
        <iframe id={IFRAME_ID} src={"http://localhost:8080"} className="h-full w-full" sandbox="allow-scripts allow-same-origin" />
      </div>
      {
        mode == "festim" && simulation &&
        <FESTIMCodePrompts postProcessingDone={postProcessingDone} sendPythonRequest={sendPythonRequest} processingCode={processingCode} currentIndex={currentIndex} setCurrentIndex={setCurrentIndex} bindings={bindings} updateBindings={updateBindings} simulation={simulation} />
      }
    </div>
  )
}