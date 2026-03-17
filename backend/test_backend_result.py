import httpx
import time
import json

def test_backend():
    base_url = "http://127.0.0.1:8000"
    claim = "Forward this message to 10 friends to win a free iPhone"
    
    print(f"Submitting claim: {claim}")
    resp = httpx.post(f"{base_url}/verify", json={"text": claim, "url": ""})
    if resp.status_code != 200:
        print(f"Error: {resp.status_code} {resp.text}")
        return
    
    task_id = resp.json()["task_id"]
    print(f"Task ID: {task_id}")
    
    for _ in range(30):
        time.sleep(2)
        resp = httpx.get(f"{base_url}/result/{task_id}")
        data = resp.json()
        if data["status"] == "completed":
            print("Analysis COMPLETED")
            result = data["result"]
            print("--- FLAGS ---")
            print(json.dumps(result.get("flags", []), indent=2))
            print("--- EXTRACTED CLAIMS ---")
            print(json.dumps(result.get("extractedClaims", []), indent=2))
            return
        elif data["status"] == "failed":
            print(f"Analysis FAILED: {data.get('error')}")
            return
        else:
            print(f"Status: {data['status']}...")

if __name__ == "__main__":
    test_backend()
