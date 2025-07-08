# --- IMPORTS ---
import os
import json
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
from langchain_community.document_loaders import JSONLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_community.vectorstores import FAISS
from langchain.chains import RetrievalQA
# NEW: Import ChatGroq instead of ChatOpenAI
from langchain_groq import ChatGroq

# --- INITIALIZATION ---
load_dotenv()
# We now need the Groq key
if not os.getenv("GROQ_API_KEY"):
    raise ValueError("GROQ_API_KEY not found in .env file. Please add it.")

try:
    with open('../data/knowledge_base.json', encoding='utf-8') as f:
        full_documents_data = json.load(f)
except FileNotFoundError:
    raise FileNotFoundError("knowledge_base.json not found in the 'data' directory.")

# --- FLASK APP SETUP ---
app = Flask(__name__)
CORS(app)

# --- LANGCHAIN RAG IMPLEMENTATION ("THE BRAIN") ---
qa_chain = None
try:
    print("1. Loading knowledge base from JSON...")
    loader = JSONLoader(file_path='../data/knowledge_base.json', jq_schema='.[].content', text_content=False)
    documents = loader.load()

    print("2. Splitting documents into smaller chunks...")
    text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=150)
    texts = text_splitter.split_documents(documents)

    print("3. Creating vector store with FREE, LOCAL embeddings...")
    model_name = "sentence-transformers/all-MiniLM-L6-v2"
    embeddings = HuggingFaceEmbeddings(model_name=model_name)
    vector_store = FAISS.from_documents(texts, embeddings)
    retriever = vector_store.as_retriever(search_kwargs={"k": 1})

    print("4. Creating the QA Chain (using FREE Groq model)...")
    # NEW: Use ChatGroq with a fast, free model
    llm = ChatGroq(
        temperature=0.1,
        model_name="llama3-8b-8192"
    )
    
    qa_chain = RetrievalQA.from_chain_type(
        llm=llm,
        chain_type="stuff",
        retriever=retriever,
        return_source_documents=True
    )
    print("✅✅✅ AI Brain is ready! (Powered by Groq) ✅✅✅")

except Exception as e:
    print(f"❌❌❌ Error during AI setup: {e} ❌❌❌")

# --- API ENDPOINT & RUNNER (No changes needed below this line) ---
@app.route('/ask', methods=['POST'])
def ask_question():
    if not qa_chain:
        return jsonify({"error": "AI Brain is not initialized. Please check backend logs."}), 500

    data = request.get_json()
    query = data.get('query')

    if not query:
        return jsonify({"error": "Query is required"}), 400

    print(f"➡️ Received query: {query}")
    try:
        result = qa_chain.invoke(query)
        answer = result.get('result', "I couldn't find a definitive answer.")
        source_docs = result.get('source_documents', [])
        
        source_metadata = {}
        if source_docs:
            best_doc_content = source_docs[0].page_content
            found_doc = next((doc for doc in full_documents_data if best_doc_content in doc.get('content', '')), None)
            if found_doc:
                 source_metadata = found_doc

        print(f"⬅️ Sending answer: {answer}")
        response = { "answer": answer, "metadata": source_metadata }
        return jsonify(response)
    except Exception as e:
        print(f"Error during query processing: {e}")
        return jsonify({"error": "An error occurred while processing your question."}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)