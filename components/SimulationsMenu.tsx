import { FESTIMSim } from "@/utils/simulations"
import { faXmark } from "@fortawesome/free-solid-svg-icons"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import Image from "next/image"

export default function SimulationsMenu({simulations, simulationsMenuVisible, setSimulationsMenuVisible, selectSimulation}: {simulations:FESTIMSim[], simulationsMenuVisible:boolean, setSimulationsMenuVisible:Function, selectSimulation:Function}) {

    return (
        <>
      {
        simulationsMenuVisible &&
        <div className="absolute left-0 top-0 w-full h-full container  z-20 bg-primarybg/75!">
          <div className="container w-4/5 h-4/5 m-auto shadow-2xl shadow-indigo-500">
            <FontAwesomeIcon onClick={() => setSimulationsMenuVisible(false)} className="ml-auto cursor-pointer text-primary hover:text-red-400 ease-in-out duration-300" icon={faXmark}></FontAwesomeIcon>          
            <p className="text-base text-center">Preset Simulations</p>
            <div className="overflow-y-auto py-4 w-full grid grid-cols-4 gap-2">
              {
                simulations.map((sim, i) => (
                  <div onClick={() => selectSimulation(sim)} key={`simulation${i}`} className="group h-96 hover:-translate-y-2 ease-in-out duration-300 cursor-pointer flex flex-col px-2 py-2 space-y-2 rounded-sm bg-lightbg">
                    <p className="text-base text-primary font-semibold">{sim.title}</p>
                    <p className="text-sm text-wrap break-all text-primary h-1/3 overflow-y-auto pr-2">{sim.description}</p>
                    {sim.imageUrl && <div className="mt-auto space-y-2 p-3 bg-blue-200 rounded">
                      <Image alt={`Display image for ${sim.title} simulation`} height={1000} width={1000} src={sim.imageUrl} className="rounded-sm w-full h-auto"></Image>
                      {sim.imageCaption && <p className="text-xs text-primary text-start italic">{sim.imageCaption}</p>}
                      </div>}
                  </div>
                ))
              }
            </div>
          </div>
        </div>
      }</>
    )
}