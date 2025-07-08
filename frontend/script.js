document.addEventListener('DOMContentLoaded', () => {
    // --- CHAT POPUP LOGIC ---
    const chatPopup = document.getElementById('chat-popup');
    const chatBubble = document.getElementById('chat-bubble');
    const closeBtn = document.getElementById('close-btn');
    const openChatCta = document.getElementById('open-chat-cta');

    const toggleChat = () => chatPopup.classList.toggle('open');

    chatBubble.addEventListener('click', toggleChat);
    closeBtn.addEventListener('click', toggleChat);
    if (openChatCta) {
        openChatCta.addEventListener('click', toggleChat);
    }
    
    // --- CHATBOT CORE LOGIC ---
    const chatBox = document.getElementById('chat-box');
    const userInput = document.getElementById('user-input');
    const sendBtn = document.getElementById('send-btn');
    const micBtn = document.getElementById('mic-btn');
    const API_URL = 'http://127.0.0.1:5000/ask';

    const handleUserQuery = async () => {
        const query = userInput.value.trim();
        if (!query) return;

        // Remove example questions if they exist
        const exampleQuestions = chatBox.querySelector('.example-questions');
        if (exampleQuestions) exampleQuestions.remove();

        addMessage(query, 'user');
        userInput.value = '';
        userInput.focus();

        const thinkingMessage = addMessage('...', 'bot');

        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: query })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Network response was not ok.');
            }
            
            const data = await response.json();
            updateMessage(thinkingMessage, data.answer);

            // NEW: Check for and render rich metadata
            const metadata = data.metadata;
            if (metadata && metadata.type) {
                if (metadata.type === 'image' && metadata.image_url) {
                    appendImage(metadata.image_url);
                } else if (metadata.type === 'table' && metadata.data_table) {
                    appendTable(metadata.data_table);
                }
            }
            
            // NEW: Check for location keywords in the answer for geo-links
            const answerText = data.answer.toLowerCase();
            const cities = ["chennai", "mumbai", "delhi", "kolkata", "bengaluru", "hyderabad", "odisha", "kerala"];
            for (const city of cities) {
                if (answerText.includes(city)) {
                    addMapLink(city);
                    break; 
                }
            }

        } catch (error) {
            console.error('Error:', error);
            updateMessage(thinkingMessage, `Sorry, an error occurred: ${error.message}`);
        }
    };

    function addMessage(text, sender) {
        const messageElement = document.createElement('div');
        messageElement.classList.add('message', `${sender}-message`);
        const p = document.createElement('p');
        p.textContent = text;
        messageElement.appendChild(p);
        chatBox.appendChild(messageElement);
        
        // Add example questions only for the very first welcome message
        if (sender === 'bot' && chatBox.querySelectorAll('.message').length === 1) {
            addExampleQuestions();
        }
        
        scrollToBottom();
        return messageElement;
    }

    function updateMessage(messageElement, newText) {
        messageElement.querySelector('p').textContent = newText;
        scrollToBottom();
    }
    
    function addExampleQuestions() {
        const questionsContainer = document.createElement('div');
        questionsContainer.className = 'example-questions';
        const questions = ["Show me an image from INSAT-3DR", "What are the payloads on Oceansat-2?", "What is MOSDAC's role in disaster management?"];
        questions.forEach(q => {
            const btn = document.createElement('button');
            btn.textContent = q;
            btn.onclick = () => {
                userInput.value = q;
                handleUserQuery();
            };
            questionsContainer.appendChild(btn);
        });
        chatBox.appendChild(questionsContainer);
        scrollToBottom();
    }

    function appendImage(url) {
        const imgContainer = document.createElement('div');
        imgContainer.style.padding = '10px';
        imgContainer.style.alignSelf = 'center';
        const imgElement = document.createElement('img');
        imgElement.src = url;
        imgElement.style.maxWidth = '100%';
        imgElement.style.borderRadius = '10px';
        imgContainer.appendChild(imgElement);
        chatBox.appendChild(imgContainer);
        scrollToBottom();
    }

    function appendTable(tableData) {
        const table = document.createElement('table');
        table.className = 'data-table';
        const thead = table.createTHead();
        const headerRow = thead.insertRow();
        tableData.headers.forEach(headerText => {
            const th = document.createElement('th');
            th.textContent = headerText;
            headerRow.appendChild(th);
        });
        const tbody = table.createTBody();
        tableData.rows.forEach(rowData => {
            const row = tbody.insertRow();
            rowData.forEach(cellData => {
                const cell = row.insertCell();
                cell.textContent = cellData;
            });
        });
        chatBox.appendChild(table);
        scrollToBottom();
    }
    
    function addMapLink(location) {
        const link = document.createElement('a');
        link.href = `https://www.google.com/maps/search/?api=1&query=${location}`;
        link.textContent = `🗺️ View ${location.charAt(0).toUpperCase() + location.slice(1)} on a map`;
        link.target = '_blank';
        link.className = 'map-link';
        chatBox.appendChild(link);
        scrollToBottom();
    }

    function scrollToBottom() {
        chatBox.scrollTop = chatBox.scrollHeight;
    }

    sendBtn.addEventListener('click', handleUserQuery);
    userInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') e.preventDefault(); handleUserQuery();
    });

    // --- VOICE INPUT LOGIC ---
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        micBtn.addEventListener('click', () => recognition.start());
        recognition.onstart = () => { micBtn.classList.add('listening'); userInput.placeholder = "Listening..."; };
        recognition.onend = () => { micBtn.classList.remove('listening'); userInput.placeholder = "Ask anything..."; };
        recognition.onresult = (event) => {
            userInput.value = event.results[0][0].transcript;
            setTimeout(handleUserQuery, 300);
        };
    } else {
        micBtn.style.display = "none";
    }
});