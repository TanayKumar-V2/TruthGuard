import httpx
try:
    resp = httpx.get("http://127.0.0.1:8000/metrics")
    print(resp.text)
except Exception as e:
    print(e)
