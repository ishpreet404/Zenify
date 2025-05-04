import ollama  # Ensure this is the correct 'ollama' package

# Generate a response using Gemma 3
response = ollama.generate(model="gemma3:latest", prompt="What is the capital of France?")
print(response['response'])