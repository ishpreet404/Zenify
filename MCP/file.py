import pandas as pd
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.preprocessing import LabelEncoder
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import classification_report

values = {0:"Not suicidal", 1:"Suicidal"}
df = pd.read_csv("Suicide_Detection.csv")

df_cleaned = df[['text', 'class']].copy()

label_map = {'non-suicide': 0, 'suicide': 1}
df_cleaned['label'] = df_cleaned['class'].map(label_map)

df_cleaned.drop(columns='class', inplace=True)

df_sorted = df_cleaned.sort_values(by='text').reset_index(drop=True)

texts = np.array(df['text'])
vectorizer = TfidfVectorizer()
X = vectorizer.fit_transform(texts)  

labels = np.array(df['class'])
encoder = LabelEncoder()
y = encoder.fit_transform(labels)  

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2)
model = LogisticRegression()
model.fit(X_train, y_train)

text = ["I want to die"] 
text_transformed = vectorizer.transform(text)
y_pred = model.predict(text_transformed)
print(values[y_pred[0]])