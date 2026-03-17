import os
from google import genai
from google.genai import types

def test_search():
    client = genai.Client()
    tool = types.Tool(google_search=types.GoogleSearch())
    config = types.GenerateContentConfig(
        tools=[tool],
        temperature=0.1
    )
    print("Testing gemini-2.5-flash generate_content...")
    try:
        res = client.models.generate_content(
            model="gemini-2.5-flash",
            contents="what is the weather in tokyo right now",
            config=config
        )
        print("2.5 Response text:", res.text)
    except Exception as e:
        print("2.5 Error:", type(e).__name__, str(e))

if __name__ == "__main__":
    test_search()
