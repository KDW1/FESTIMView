import { Geist_Mono } from "next/font/google";
import { useEffect } from "react";

export type ConsoleArg = {
    message: string,
    status: string,
}

export default function PythonConsole({ args }: { args: ConsoleArg[] }) {
    const argColors: { [key: string]: string } = {
        "info": "text-indigo-700",
        "error": "text-rose-700",
        "output": "text-blue-500",
        "evaluation": "text-green-500",
        "notification": "text-amber-500"
    }

    const getPrefix = (status: string) => {
        switch (status) {
            case "info":
                return "INFO: "
            case "error":
                return "ERROR: "
            case "output":
                return "OUTPUT: "
            case "evaluation":
                return "RESULT: "
            case "notification":
                return "NOTIFICATION: "
        }
    }
    useEffect(()=>{
        let scroll = document.getElementById("scrollbar");
        if(scroll) scroll.scrollTop = scroll.scrollHeight;
    }, [args])
    return (
        <div className="flex-1 flex w-full z-10 max-h-1/4 shadow-2xl">
            {/* <p className="font-semibold text-primary">Python Console.</p> */}
            <div id="scrollbar" className="w-full flex flex-col overflow-y-scroll bg-slate-950 text-xs rounded-md">
                <div className="flex w-0 h-0"></div>
                {
                    args.map((arg, i) => (
                        <code key={`arg${i}`} className={`w-full whitespace-pre-line px-4 py-2 font-mono ${argColors[arg.status]} border-b-2 border-slate-800`}>
                            <span className="font-semibold">{getPrefix(arg.status)}</span> 
                            {typeof arg.message == "string" && arg.message.includes("\n") && (<br/>)}
                            {arg.message}
                            </code>
                    ))
                }
                {args.length == 0 &&
                    (
                        <div className="flex flex-col font-mono space-y-2 text-slate-400 mx-auto my-auto items-center">
                            <span className="text-xl">{">"}:[</span>
                            <p className="italic">There is nothing here</p>
                        </div>
                    )
                }
            </div>
        </div>
    )
}