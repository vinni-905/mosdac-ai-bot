document.addEventListener('DOMContentLoaded', () => {
    // --- CHAT POPUP LOGIC ---
    const chatPopup = document.getElementById('chat-popup');
    const chatBubble = document.getElementById('chat-bubble');
    const closeBtn = document.getElementById('close-btn');
    const openChatCta = document.getElementById('open-chat-cta');

    const toggleChat = () => {
        chatPopup.classList.toggle('open');
    };

    chatBubble.addEventListener('click', toggleChat);
    closeBtn.addEventListener('click', toggleChat);
    if(openChatCta) {
        openChatCta.addEventListener('click', toggleChat);
    }
    
    // --- CHATBOT CORE LOGIC (from before) ---
    const chatBox = document.getElementById('chat-box');
    const userInput = document.getElementById('user-input');
    const sendBtn = document.getElementById('send-btn');
    const micBtn = document.getElementById('mic-btn');
    const API_URL = 'http://127.0.0.1:5000/ask';

    const handleUserQuery = async () => {
        const query = userInput.value.trim();
        if (!query) return;

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
        scrollToBottom();
        return messageElement;
    }

    function updateMessage(messageElement, newText) {
        const p = messageElement.querySelector('p');
        p.textContent = newText;
        scrollToBottom();
    }

    function scrollToBottom() {
        chatBox.scrollTop = chatBox.scrollHeight;
    }

    sendBtn.addEventListener('click', handleUserQuery);
    userInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleUserQuery();
        }
    });

    // --- VOICE INPUT LOGIC ---
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        micBtn.addEventListener('click', () => recognition.start());
        recognition.onstart = () => {
            micBtn.classList.add('listening');
            userInput.placeholder = "Listening...";
        };
        recognition.onend = () => {
            micBtn.classList.remove('listening');
            userInput.placeholder = "Ask anything...";
        };
        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            userInput.value = transcript;
            setTimeout(handleUserQuery, 300);
        };
    } else {
        micBtn.style.display = "none";
    }
});