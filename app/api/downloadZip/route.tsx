import { sendZipFileRequest } from "@/utils/api"

export async function POST(req: Request) {
    const { filepath, directory } = await req.json()
    const zipFileData = await sendZipFileRequest(filepath, directory)
    if (zipFileData.headers.get("Content-Type") == "application/json") {
      let jsonData = await zipFileData.json()
      console.log(jsonData)
      return Response.json(jsonData)
    } else {
        let blob = await zipFileData.blob()
        console.log("Serving zip file...")
        return new Response(blob, { headers: { "Content-Type": "application/zip", "Content-Disposition": `attachment; filename = exports.zip` } })
    }
}