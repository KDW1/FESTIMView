import { sendExecRequest, sendPostProcessingRequest } from "@/utils/api"
import { NextResponse } from "next/server"

export const dynamic = 'force-dynamic'; // Prevent Next.js from caching the response

export async function POST(req: Request) {
    const { code, filepath } = await req.json()
    console.log("Sending post processing request")
    try {
        const upstream = await sendPostProcessingRequest(code, true, filepath)

        return new Response(upstream.body, {
            status: 200,
            headers: {
                'Content-Type': 'text/event-stream; charset=utf-8',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
                'Content-Encoding': 'none', // Crucial: Prevents compression libraries from buffering the whole stream
            },
        })
    } catch (error) {
        console.log("We received this error on the backend: ", error)
        return Response.json({
            success: false,
            error: `${error}`
        })
    }
}