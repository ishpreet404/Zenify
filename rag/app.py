from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List
import json
import hnswlib
import numpy as np
from sentence_transformers import SentenceTransformer
import openai
import os

### CONFIGURATION ###
# Set your API key
openai.api_key = os.getenv("OPENAI_API_KEY")  # Set env variable or similar

### MODEL CLASSES ###
class QueryRequest(BaseModel):
    query: str

class Document(BaseModel):
    title: str
    content: str

class DocumentsRequest(BaseModel):
    documents: List[Document]

### CORE LOGIC FUNCTIONS ###
def extract_text_from_json(json_data):
    print("Extracting text from JSON data")
    combined_text = ""
    for entry in json_data:
        content = entry.get('content', '')
        combined_text += content + "\n"
    return combined_text

def split_into_passages(text, max_length=500):
    print("Splitting text into passages")
    return [text[i:i + max_length] for i in range(0, len(text), max_length)]

def load_encoder():
    print("Loading sentence transformer model")
    return SentenceTransformer('all-MiniLM-L6-v2')

def build_index(passages, encoder):
    print("Building HNSWLib index")
    passage_embeddings = encoder.encode(passages)
    dimension = passage_embeddings.shape[1]
    index = hnswlib.Index(space='cosine', dim=dimension)
    index.init_index(max_elements=len(passages), ef_construction=200, M=16)
    index.add_items(passage_embeddings, np.arange(len(passages)))
    return index, passage_embeddings  # Also return passage_embeddings if needed

def retrieve_passages(query, index, passages, encoder, top_k=3):
    top_k = min(top_k, len(passages))  # ENSURE WE DON'T ASK FOR MORE THAN WE HAVE
    query_embedding = encoder.encode([query])
    indices, _ = index.knn_query(query_embedding, k=top_k)
    return [passages[i] for i in indices[0]]

def generate_response_with_openai(query, passages):
    context = "\n".join(passages)
    prompt = f"Context:\n{context}\n\nQuestion: {query}\nAnswer (tabular if possible):"
    try:
        response = openai.ChatCompletion.create(
            model="gpt-3.5-turbo",    # or "gpt-4" if you have access
            messages=[
                {"role": "system", "content": "You are a helpful assistant for document analysis."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=500,
            temperature=0.2
        )
        return response['choices'][0]['message']['content']
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

### FASTAPI APP ###
app = FastAPI()

# We'll store state in app variables for demo, for scale use a database etc.
encoder = load_encoder()
app.state.encoder = encoder
app.state.index = None
app.state.passages = []

@app.post("/process_documents/")
def process_documents(request: DocumentsRequest):
    # Process incoming JSON and create index
    json_data = [doc.dict() for doc in request.documents]
    combined_text = extract_text_from_json(json_data)
    passages = split_into_passages(combined_text)
    index, _ = build_index(passages, encoder)
    app.state.index = index
    app.state.passages = passages
    return {"message": "Documents processed and index built.", "num_passages": len(passages)}

@app.post("/query/")
def query_documents(request: QueryRequest):
    if app.state.index is None or not app.state.passages:
        raise HTTPException(status_code=400, detail="No documents indexed. Use /process_documents/ first.")
    top_k = 3
    retrieved_passages = retrieve_passages(request.query, app.state.index, app.state.passages, encoder, top_k)
    print(retrieve_passages)
    # response = generate_response_with_openai(request.query, retrieved_passages)
    return { "retrieved_passages": retrieved_passages}  

@app.get("/")
def root():
    return {"msg": "RAG microservice. POST /process_documents/ first, then POST /query/."}