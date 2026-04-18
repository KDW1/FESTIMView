import { sendExecRequest } from "@/utils/api"
export async function GET() {
  return Response.json({
    projectName: 'Next.js',
  })
}

export async function POST(req : Request) {
  const { code } = await req.json()
  const data = await sendExecRequest(code)
  return Response.json({
    projectName: 'Next.js',
  })
}