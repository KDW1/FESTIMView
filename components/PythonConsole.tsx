import { Geist_Mono } from "next/font/google";

export type ConsoleArg = {
    message: string,
    status: string,
}

export default function PythonConsole({ args }: { args: ConsoleArg[] }) {
    const argColors: { [key: string]: string } = {
        "info": "text-indigo-700",
        "error": "text-rose-700",
        "output": "text-amber-500",
        "evaluation": "text-green-500"
    }

    const getPrefix = (status: string) => {
        switch (status) {
            case "info":
                return "INFO: "
                break
            case "error":
                return "ERROR: "
                break
            case "output":
                return "OUTPUT: "
                break
            case "evaluation":
                return "RESULT: "
        }
    }

    return (
        <div className="w-1/2 space-y-0 container">
            <p className="font-semibold ">Python Console.</p>
            <div className="h-full flex flex-col overflow-y-auto pb-2 bg-slate-950 text-xs rounded-md">
                {
                    args.map((arg, i) => (
                        <p key={`arg${i}`} className={`w-full px-4 py-2 font-mono ${argColors[arg.status]} border-b-2 border-slate-800`}>
                            <span className="font-semibold">{getPrefix(arg.status)}</span>
                            {arg.message}
                            </p>
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