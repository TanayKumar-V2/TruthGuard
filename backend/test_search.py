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
    print("Testing generate_content...")
    res = client.models.generate_content(
        model="gemini-2.5-flash",
        contents="what is the weather in tokyo right now",
        config=config
    )
    
    print("Response text:", res.text)
    
    cand = res.candidates[0]
    metadata = getattr(cand, "grounding_metadata", None)
    if metadata:
        print("Metadata found! Has chunks:", bool(metadata.grounding_chunks))

if __name__ == "__main__":
    test_search()
