import openai
import os

def init_api():
    with open(".env") as env:
        for line in env:
            key, value = line.strip().split("=")
            os.environ[key] = value

    openai.api_key = os.environ.get("API_KEY")

init_api()

initial_prompt = """You: Hi there!
You: Hello!
AI: How are you?
You: {}
AI: """

history = ""

while True:
    prompt = input("You: ")

    response = openai.Completion.create(
        engine="text-davinci-003",
        prompt=initial_prompt.format(history + prompt),
        temperature=1,
        max_tokens=100,
        stop=[" You:", " AI:"],
    )
    print("ARG: |" + initial_prompt.format(history + prompt)+" |")

    response_text = response.choices[0].text
    history += "You: "+ prompt + "\n" + "AI: " + response_text + "\n"

    print("AI: |" + response_text+" |")

    print("history: |" + history+" |")
