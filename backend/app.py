# --- IMPORTS (Final, clean version) ---
import os
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

from langchain_community.document_loaders import JSONLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_community.vectorstores import FAISS
from langchain.chains import RetrievalQA
from langchain_openai import ChatOpenAI

# --- INITIALIZATION ---
load_dotenv()
if not os.getenv("OPENAI_API_KEY"):
    raise ValueError("OPENAI_API_KEY not found in .env file. Please add it.")

# --- FLASK APP SETUP ---
app = Flask(__name__)
CORS(app)

# --- LANGCHAIN RAG IMPLEMENTATION ("THE BRAIN") ---
qa_chain = None
try:
    print("1. Loading knowledge base from JSON...")
    loader = JSONLoader(
        file_path='../data/knowledge_base.json',
        jq_schema='.[].content',
        text_content=False
    )
    documents = loader.load()

    print("2. Splitting documents into smaller chunks...")
    text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=150)
    texts = text_splitter.split_documents(documents)

    print("3. Creating vector store with FREE, LOCAL embeddings...")
    model_name = "sentence-transformers/all-MiniLM-L6-v2"
    model_kwargs = {'device': 'cpu'}
    encode_kwargs = {'normalize_embeddings': False}
    embeddings = HuggingFaceEmbeddings(
        model_name=model_name,
        model_kwargs=model_kwargs,
        encode_kwargs=encode_kwargs
    )

    vector_store = FAISS.from_documents(texts, embeddings)
    retriever = vector_store.as_retriever(search_kwargs={"k": 3})

    print("4. Creating the QA Chain (still using OpenAI for chat)...")
    llm = ChatOpenAI(model_name="gpt-3.5-turbo", temperature=0.1)
    qa_chain = RetrievalQA.from_chain_type(
        llm=llm,
        chain_type="stuff",
        retriever=retriever
    )
    print("✅✅✅ AI Brain is ready! ✅✅✅")

except Exception as e:
    print(f"❌❌❌ Error during AI setup: {e} ❌❌❌")

# --- API ENDPOINT ---
@app.route('/ask', methods=['POST'])
def ask_question():
    if not qa_chain:
        return jsonify({"error": "AI Brain is not initialized. Please check backend logs for errors."}), 500

    data = request.get_json()
    # THIS LINE IS NOW FIXED
    query = data.get('query')

    if not query:
        return jsonify({"error": "Query is required"}), 400

    print(f"➡️ Received query: {query}")
    try:
        # Using .invoke is the newer method for chains
        result = qa_chain.invoke(query)
        # The result from .invoke is often a dictionary
        answer = result.get('result', "I couldn't find a definitive answer.")
        
        print(f"⬅️ Sending answer: {answer}")
        response = {"answer": answer}
        return jsonify(response)
    except Exception as e:
        print(f"Error during query processing: {e}")
        return jsonify({"error": "An error occurred while processing your question."}), 500

# --- RUN THE APP ---
if __name__ == '__main__':
    app.run(debug=True, port=5000)