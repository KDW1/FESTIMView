let currentBackend: Backend | null = null

const RETRY_TIME_SECONDS = 0.5

class Backend {
    backendDomain: string;

    constructor() {
        this.backendDomain = process.env.BACKEND_DOMAIN as string
    }

    async sendPostProcessingRequest(code : string, postprocessing : boolean, filepath : string | null = null) {
        console.log("Sending post processing request to execution...")
        const data = await this.sendRequest("/exec", "POST", { code, postprocessing, filepath })
        if (!data.error) {
            return data
        } else {
            return {
                success: false,
                error: data.error
            }
        }
    }

    async sendExecRequest(code: string) {
        console.log("Sending execution request...")
        const data = await this.sendRequest("/exec", "POST", { code }).then(res => this.convertToJSON(res))
        if (!data.error) {
            return data
        } else {
            return {
                success: false,
                error: data.error
            }
        }
    }

    async sendEvalRequest(expr: string) {
        console.log("Sending evaluation request...")
        console.log("Expression: ", expr)
        const data = await this.sendRequest("/eval", "POST", { expr }).then(res => this.convertToJSON(res))
        if (!data.error) {
            return data
        } else {
            return {
                success: false,
                error: data.error
            }
        }
    }

    async convertToJSON(res: Response) {
        try {
            let text = await res.text()
            let parsedData = JSON.parse(text)
            return parsedData
        } catch (error) {
            return {
                success: false,
                failed: true,
                error: "Failed to successfully parse text into JSON"
            }
        }
    }

    async sendRequest(path: string, method: string = "GET", data: any = null, additionalHeaders: { [key: string]: any } = {}, requestCount: number = 1): Promise<any> {
        try {
            console.log(this.backendDomain + path)
            let res = await fetch(this.backendDomain + path, {
                method: method,
                body: JSON.stringify(data),
                headers: {
                    "Content-Type": "application/json",
                    ...additionalHeaders
                }
            })
            return res
        } catch (error) {
            console.log(`Failed to fetch from ${path}, received error: ${error}`)
            if (requestCount < 3) {
                setTimeout(async () => {
                    return await this.sendRequest(path, method, data, additionalHeaders, requestCount + 1)
                }, RETRY_TIME_SECONDS * 1000)
            } else {
                return Response.json({
                    success: false,
                    failed: true,
                    error: "Failed to successfully send request"
                })
            }
        }
    }
}

const getBackend = async () => {
    if (!currentBackend) {
        currentBackend = new Backend()
    }
    return currentBackend
}

const sendExecRequest = async (code: string) => {
    const backend = await getBackend()
    const data = await backend.sendExecRequest(code)
    return data
}

const sendEvalRequest = async (code: string) => {
    const backend = await getBackend()
    const data = await backend.sendEvalRequest(code)
    return data
}

const sendPostProcessingRequest = async(code : string, postprocessing : boolean, filepath : string | null = null) => {
    const backend = await getBackend()
    const data = await backend.sendPostProcessingRequest(code, postprocessing, filepath)
    console.log("Data being sent to Next.js route: ", data)
    return data
}

export {
    sendExecRequest,
    sendEvalRequest,
    sendPostProcessingRequest
}