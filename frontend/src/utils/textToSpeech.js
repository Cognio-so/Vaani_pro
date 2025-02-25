const DEEPGRAM_API_KEY = import.meta.env.VITE_DEEPGRAM_API_KEY;

let currentAudio = null;

export const speakWithDeepgram = async (text, detectedLanguage = 'en-US') => {
  // Stop any ongoing speech first
  stopSpeaking();
  
  try {
    console.log('🎯 TTS Request:', { text: text.trim(), language: detectedLanguage });
    
    if (!text || typeof text !== 'string' || text.trim() === '') {
      throw new Error('Text must be a non-empty string.');
    }

    const baseLanguage = detectedLanguage.split('-')[0].toLowerCase();

    // Simplified payload according to Deepgram API requirements
    const payload = {
      text: text.trim()
    };

    // Only add model for non-English languages
    if (baseLanguage !== 'en') {
      payload.model = `${baseLanguage}-nova-3`;
    }

    console.log('🚀 Sending TTS request:', payload);

    const response = await fetch('https://api.deepgram.com/v1/speak', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${DEEPGRAM_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('❌ TTS API error:', errorData);
      throw new Error(`TTS API error: ${response.status} - ${errorData.err_msg || 'Unknown error'}`);
    }

    console.log('✅ TTS response received');
    const audioBlob = await response.blob();
    const audioUrl = URL.createObjectURL(audioBlob);
    const audio = new Audio(audioUrl);
    
    currentAudio = audio;

    return new Promise((resolve, reject) => {
      audio.addEventListener('play', () => {
        console.log('🔊 Audio playback started');
      });

      audio.addEventListener('ended', () => {
        console.log('✅ Audio playback completed');
        URL.revokeObjectURL(audioUrl);
        if (currentAudio === audio) {
          currentAudio = null;
        }
        resolve();
      });

      audio.addEventListener('error', (e) => {
        console.error('❌ Audio playback error:', e);
        URL.revokeObjectURL(audioUrl);
        if (currentAudio === audio) {
          currentAudio = null;
        }
        reject(new Error('Audio playback error'));
      });

      console.log('▶️ Starting audio playback');
      audio.play().catch(error => {
        console.error('❌ Audio playback failed:', error);
        URL.revokeObjectURL(audioUrl);
        if (currentAudio === audio) {
          currentAudio = null;
        }
        reject(error);
      });
    });
  } catch (error) {
    console.error('❌ TTS error:', error);
    throw error;
  }
};

export const stopSpeaking = () => {
  console.log('🛑 Stopping current audio');
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
    currentAudio = null;
  }
};

export const isSpeaking = () => {
  return currentAudio !== null && !currentAudio.paused;
};