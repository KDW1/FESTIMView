import { sendEvalRequest } from "@/utils/api"

export async function GET() {
  return Response.json({
    projectName: 'Next.js',
  })
}

export async function POST(req : Request) {
  const { code } = await req.json()
  const data = await sendEvalRequest(code)
  console.log("Data from api/eval:", data)
  return Response.json(data)
}