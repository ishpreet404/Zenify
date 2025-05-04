# 🧠 AI-Powered Mental Health Support System

A comprehensive, safety-first, and scalable platform leveraging **machine learning** and **generative AI** to detect, respond to, and manage mental health risks—while also providing journaling and mood-tracking capabilities.

---

## Table of Contents
1. [Overview](#overview)  
2. [Features](#features)  
3. [System Architecture](#system-architecture)  
4. [Tech Stack](#tech-stack)  
5. [Key Modules](#key-modules)  
6. [Installation](#installation)  
7. [Usage](#usage)  
8. [Data Privacy & Compliance](#data-privacy--compliance)  
9. [Contributing / Journal](#contributing--journal)  
10. [License](#license)  
11. [Disclaimer](#disclaimer)  
12. [Acknowledgments](#acknowledgments)  
13. [Contact](#contact)  

---

## Overview

This system is designed to identify and respond to potential suicide risks in real-time using advanced **machine learning classification** (TF-IDF and Logistic Regression) and **Retrieval Augmented Generation (RAG)**, integrated with **generative models** (e.g., OpenAI GPT, Gemini) to provide empathetic, context-aware responses. In addition to AI-based direct support, it offers a **journal** and **mood tracking** feature set for users to record personal reflections and monitor their emotional well-being over time.

---

## Features

- **Automatic Suicide Risk Detection**  
  Uses a **Machine Learning Classification Pipeline (MCP)** with TF-IDF and logistic regression to flag concerning user-generated text.
  
- **Keyword Screening**  
  Real-time filter for suicide/self-harm keywords to initially flag content for review.

- **RAG (Retrieval Augmented Generation)**  
  Integration of curated resources and knowledge bases to enhance AI responses with relevant context.

- **Generative AI Support**  
  Empathetic and context-rich conversations powered by **OpenAI GPT** and **Gemini** APIs.

- **Admin Dashboard**  
  A **React**-based interface for administrators to:
  - Review flagged messages
  - Escalate urgent cases
  - Annotate conversation histories
  - View mood/journal summaries (according to user consent)

- **Mood & Journal Tracking**  
  Enables users to log daily/weekly moods and maintain private journals with optional **sentiment analysis** and personal progress charts.

- **Compliance & Audit Logging**  
  Facilitates compliance with data privacy regulations (GDPR, HIPAA-like requirements for health data).

---

## System Architecture

1. **FastAPI Backend**  
   - Hosts the classification model, manages user data, handles API routes.  
2. **Gemini / OpenAI Integration**  
   - Powers generative responses using relevant context.  
3. **React Admin Dashboard**  
   - Allows moderators or mental health professionals to review and manage flagged content.  

---

## Tech Stack

- **Backend:** Python, FastAPI, Scikit-learn, SQLite/PostgreSQL  
- **Frontend:** React, Material-UI  
- **AI APIs:** Gemini, OpenAI GPT  
- **Others:** Docker (optional), JWT-based Auth, RESTful Services  

---

## Key Modules

1. **MCP Model**  
   - Preprocessing: Text cleaning & tokenization  
   - Feature Extraction: **TF-IDF**  
   - Classifier: **Logistic Regression**  
   - **Keyword Matching** for initial detection  

2. **Mood & Journal Tracking**  
   - Users can log their **mood** on a daily/weekly schedule (numeric scale, emoji-based, etc.).  
   - A **journal** for personal reflections—can optionally run **sentiment analysis**.  
   - Trend charts to visualize emotional patterns.  

3. **RAG Pipeline**  
   - Combines AI knowledge retrieval with generative models for **context-aware** responses.  
   - Ideal for referencing relevant mental health resources/articles.  

4. **Generative Response Integration**  
   - Uses **OpenAI GPT** or **Gemini** to generate empathetic, context-tuned messages.  
   - Automatic escalation triggers for high-risk user statements.  

5. **Admin Dashboard**  
   - Secure login for mental health professionals or moderators.  
   - Flagged messages review, risk assessment, and escalation.  
   - Oversees mood/journal entries (with the user’s permission).  
   - Maintains **audit logs** for compliance.  

---

## Installation

1. **Clone the Repository**  
   ```bash
   git clone https://github.com/your-org/ai-mental-health-support.git
   cd ai-mental-health-support

## Screenshots
![Screenshot (93)](https://github.com/user-attachments/assets/55cffe50-f661-4573-b520-b2f82919459e)
![Screenshot (97)](https://github.com/user-attachments/assets/8a9b6c7a-45ca-4438-9c95-ce3680205a97)
![Screenshot (96)](https://github.com/user-attachments/assets/826efad9-a55c-4319-8aab-a3d2c334066b)
![Screenshot (101)](https://github.com/user-attachments/assets/f42f2c1f-a7dc-4091-8373-6966045163b6)
