"use client"
import PythonCodeEditor from "@/components/PythonCodeEditor";
import PythonConsole, { ConsoleArg } from "@/components/PythonConsole";
import { useState } from "react";
import Head from "next/head";
import Image from "next/image";


export default function Home() {
  const [args, setArgs] = useState<ConsoleArg[]>([])
  const updateArgs = (newArgs:ConsoleArg[]) => {
    setArgs([...args,...(newArgs.filter(el => el.message))])
  }
  return (
    <div className="h-screen bg-blue-300">
      <main className="px-16 py-16 h-full mx-auto flex flex-row gap-4">
        <PythonCodeEditor  updateArgs={updateArgs} />
        <PythonConsole args={args}/>
      </main>
    </div>
  );
}
