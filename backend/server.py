"""
Backend Proxy for Emergent Platform
Forwards /api/* requests from port 8001 to Next.js on port 3000.
Required because the platform ingress routes /api/* to port 8001,
but Next.js serves API routes on port 3000.
"""

import os
import httpx
from fastapi import FastAPI, Request
from fastapi.responses import Response

app = FastAPI()

NEXTJS_URL = "http://127.0.0.1:3000"


@app.api_route("/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"])
async def proxy(path: str, request: Request):
    url = f"{NEXTJS_URL}/{path}"
    headers = dict(request.headers)
    headers.pop("host", None)

    body = await request.body()

    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            response = await client.request(
                method=request.method,
                url=url,
                headers=headers,
                content=body,
                params=dict(request.query_params),
            )
        except httpx.ConnectError:
            return Response(
                content='{"error":"Next.js server not ready"}',
                status_code=503,
                media_type="application/json",
            )

    excluded_headers = {"transfer-encoding", "content-encoding", "content-length"}
    response_headers = {
        k: v for k, v in response.headers.items() if k.lower() not in excluded_headers
    }

    return Response(
        content=response.content,
        status_code=response.status_code,
        headers=response_headers,
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
