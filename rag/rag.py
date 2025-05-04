import fitz  # PyMuPDF
from PIL import Image
import numpy as np
import hnswlib
from sentence_transformers import SentenceTransformer
import ollama
import pytesseract
import os

pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'

def extract_text_from_pdf(pdf_path):
    print(f"Extracting text from PDF: {pdf_path}")
    doc = fitz.open(pdf_path)
    text = ""
    for page_num, page in enumerate(doc):
        print(f"Processing page {page_num + 1} of {len(doc)}")
        pix = page.get_pixmap()
        img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
        
        page_text = pytesseract.image_to_string(img)
        text += page_text
    
    print(f"Finished extracting text from {pdf_path}")
    return text

def extract_text_from_pdfs(pdf_directory):
    print(f"Extracting text from PDFs in directory: {pdf_directory}")
    all_text = ""
    for filename in os.listdir(pdf_directory):
        if filename.endswith(".pdf"):
            pdf_path = os.path.join(pdf_directory, filename)
            print(f"Processing file: {filename}")
            all_text += extract_text_from_pdf(pdf_path) + "\n"
    print("Finished extracting text from all PDFs")
    return all_text

def split_into_passages(text, max_length=500):
    print("Splitting text into passages")
    passages = [text[i:i + max_length] for i in range(0, len(text), max_length)]
    print(f"Total passages generated: {len(passages)}")
    return passages

def load_encoder():
    print("Loading sentence transformer model")
    encoder = SentenceTransformer('all-MiniLM-L6-v2')
    print("Sentence transformer model loaded successfully")
    return encoder

def build_index(passages, encoder):
    print("Building HNSWLib index")
    passage_embeddings = encoder.encode(passages)
    print(f"Shape of passage_embeddings: {passage_embeddings.shape}")
    dimension = passage_embeddings.shape[1]
    index = hnswlib.Index(space='cosine', dim=dimension)
    index.init_index(max_elements=len(passages), ef_construction=200, M=16)
    index.add_items(passage_embeddings, np.arange(len(passages)))
    print("HNSWLib index built successfully")
    return index

def retrieve_passages(query, index, passages, encoder, top_k=3):
    print(f"Retrieving top {top_k} passages for query: {query}")
    query_embedding = encoder.encode([query])
    indices, _ = index.knn_query(query_embedding, k=top_k)
    retrieved_passages = [passages[i] for i in indices[0]]
    print("Passages retrieved successfully")
    return retrieved_passages

def generate_response(query, index, passages, encoder):
    try:
        print("Generating response using Ollama")
        retrieved_passages = retrieve_passages(query, index, passages, encoder)
        context = "\n".join(retrieved_passages)
        prompt = f"Context: {context}\n\nQuestion: {query}\nAnswer:"
        response = ollama.generate(model="gemma3:latest", prompt=prompt)
        print("Response generated successfully")
        return response['response']
    except Exception as e:
        print(f"An error occurred while generating response: {e}")
        return f"An error occurred: {e}"

def main():
    pdf_directory = r"source"
    print(f"Starting RAG application with PDF directory: {pdf_directory}")
    
    combined_text = extract_text_from_pdfs(pdf_directory)
    print(f"Total text length: {len(combined_text)}")
    
    passages = split_into_passages(combined_text)
    print(f"Number of passages: {len(passages)}")
    
    encoder = load_encoder()
    
    index = build_index(passages, encoder)
    
    query = "give me the chronological order analysis of the geological revenue growth of the company in all the documents provided in tabular form"
    print(f"Query: {query}")
    response = generate_response(query, index, passages, encoder)
    print(f"Response: {response}")
    print("Response:", response)

if __name__ == "__main__":
    main()