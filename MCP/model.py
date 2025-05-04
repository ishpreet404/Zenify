# train_mcp.py
import pandas as pd
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.preprocessing import LabelEncoder
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LogisticRegression
import joblib

df = pd.read_csv("Suicide_Detection.csv")
df_cleaned = df[['text', 'class']].copy()
label_map = {'non-suicide': 0, 'suicide': 1}
df_cleaned['label'] = df_cleaned['class'].map(label_map)
df_cleaned.drop(columns='class', inplace=True)
texts = np.array(df_cleaned['text'])
vectorizer = TfidfVectorizer()
X = vectorizer.fit_transform(texts)
labels = np.array(df_cleaned['label'])

X_train, X_test, y_train, y_test = train_test_split(X, labels, test_size=0.2)
model = LogisticRegression()
model.fit(X_train, y_train)

joblib.dump(vectorizer, "vectorizer.joblib")
joblib.dump(model, "logreg_model.joblib")