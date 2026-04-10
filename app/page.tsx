import PythonCodeEditor from "@/components/PythonCodeEditor";
import Head from "next/head";
import Image from "next/image";

export default function Home() {
  return (
    <div className="h-screen w-full bg-blue-300">
      <main className="px-16 py-16 mx-auto flex gap-24 flex-col">
        <PythonCodeEditor />
      </main>
    </div>
  );
}
