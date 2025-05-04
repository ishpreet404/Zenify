# mcp_api.py
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import joblib

class TextRequest(BaseModel):
    text: str

vectorizer = joblib.load("vectorizer.joblib")
model = joblib.load("logreg_model.joblib")

app = FastAPI()

@app.post("/classify")
def classify(request: TextRequest):
    X = vectorizer.transform([request.text])
    pred = model.predict(X)
    label = "Suicidal" if pred[0] == 1 else "Not suicidal"
    return {"label": label}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("mcp_api:app", port=8001, reload=True)