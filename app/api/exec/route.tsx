import { sendExecRequest, sendPostProcessingRequest } from "@/utils/api"
import { NextResponse } from "next/server"

export async function POST(req: Request) {
  const { code, postprocessing, filepath } = await req.json()
  if (postprocessing) {
    let zipFileRes = await sendPostProcessingRequest(code, postprocessing, filepath)
    let contentType = zipFileRes.headers.get("Content-Type")
    console.log("Content-Type: ", contentType)
    if (contentType == "application/json") {
      console.log(zipFileRes)
      let jsonData = await zipFileRes.json()
      console.log(jsonData)
      return Response.json(jsonData)
    } else {
      let blob = await zipFileRes.blob()
      console.log("Serving zip file...")
      return new Response(blob, { headers: { "Content-Type": "application/zip", "Content-Disposition": `attachment; filename = exports.zip` } })
    }
  } else {
    const data = await sendExecRequest(code)
    console.log("Data from /api/exec:", data)
    return Response.json(data)
  }
}