document.addEventListener('DOMContentLoaded', () => {
  // --- CHATBOT LOGIC ---
  const chatPopup = document.getElementById('chat-popup');
  const chatBubble = document.getElementById('chat-bubble');
  const closeBtn = document.getElementById('close-btn');
  const openChatCta = document.getElementById('open-chat-cta');

  const toggleChat = () => {
    chatPopup.classList.toggle('open');
  };

  chatBubble.addEventListener('click', toggleChat);
  closeBtn.addEventListener('click', toggleChat);
  if (openChatCta) {
    openChatCta.addEventListener('click', toggleChat);
  }

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
    chatBox.scrollTop = chatBox.scrollHeight;
    return messageElement;
  }

  function updateMessage(messageElement, newText) {
    const p = messageElement.querySelector('p');
    p.textContent = newText;
    chatBox.scrollTop = chatBox.scrollHeight;
  }

  sendBtn.addEventListener('click', handleUserQuery);
  userInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleUserQuery();
    }
  });

  // --- VOICE INPUT ---
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

  // --- GRAPH TOGGLE AND RENDER ---
  const graphBubble = document.getElementById('graph-bubble');
  let graphInitialized = false;
  let network;

  graphBubble.addEventListener('click', () => {
    const graph = document.getElementById('graph-container');
    if (graph.style.display === 'none' || !graph.style.display) {
      graph.style.display = 'block';

      if (!graphInitialized) {
        const container = document.getElementById('graph-network');
        const nodes = new vis.DataSet([
          { id: 1, label: '🛰 MOSDAC', shape: 'star', size: 35, color: '#00bfff', font: { color: '#00bfff', size: 20 } },
          { id: 2, label: 'Satellite Data', color: '#1e90ff' },
          { id: 3, label: 'FAQs', color: '#00ffcc' },
          { id: 4, label: 'Documentation', color: '#ffcc00' },
          { id: 5, label: 'Products', color: '#ff6666' },
          { id: 6, label: 'AI Help Bot', shape: 'hexagon', size: 30, color: '#b266ff', font: { color: '#fff' } }
        ]);

        const edges = new vis.DataSet([
          { from: 1, to: 2 },
          { from: 1, to: 3 },
          { from: 1, to: 4 },
          { from: 1, to: 5 },
          { from: 6, to: 2, dashes: true },
          { from: 6, to: 3, dashes: true }
        ]);

        const data = { nodes, edges };

        const options = {
          nodes: {
            shape: 'dot',
            size: 18,
            font: {
              size: 16,
              face: 'monospace',
              color: '#00ffff'
            },
            borderWidth: 2,
            shadow: true
          },
          edges: {
            width: 2,
            color: { color: '#00bfff' },
            arrows: {
              to: { enabled: true, scaleFactor: 1.2 }
            },
            smooth: {
              type: 'cubicBezier',
              roundness: 0.4
            }
          },
          layout: {
            improvedLayout: true
          },
          physics: {
            solver: 'forceAtlas2Based',
            stabilization: { iterations: 150 },
            forceAtlas2Based: {
              gravitationalConstant: -30,
              springLength: 120
            }
          }
        };

        network = new vis.Network(container, data, options);
        graphInitialized = true;
      }
    } else {
      graph.style.display = 'none';
    }
  });
});
