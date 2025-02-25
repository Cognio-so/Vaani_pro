const PYTHON_API_URL = import.meta.env.VITE_PYTHON_API_URL || 'http://localhost:8000';

export const batchLLM = async (text, systemPrompt = "You are a helpful assistant.") => {
  try {
    const response = await fetch(`${PYTHON_API_URL}/batch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        systemPrompt
      })
    });

    const data = await response.json();
    return data.response;
  } catch (error) {
    console.error('Error calling Python API:', error);
    throw error;
  }
};

export const streamLLM = async function* (topic, systemPrompt = "You are a helpful assistant.") {
  try {
    const response = await fetch(`${PYTHON_API_URL}/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        topic,
        systemPrompt
      })
    });

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      
      const chunk = decoder.decode(value);
      const lines = chunk.split('\n').filter(line => line.trim() !== '');
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));
            if (data.chunk) {
              yield data.chunk;
            }
          } catch (error) {
            console.error('Error parsing stream chunk:', error);
          }
        }
      }
    }
  } catch (error) {
    console.error('Error streaming from Python API:', error);
    throw error;
  }
};