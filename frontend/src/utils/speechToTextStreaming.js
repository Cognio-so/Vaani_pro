const DEEPGRAM_API_KEY = import.meta.env.VITE_DEEPGRAM_API_KEY;

export const startSpeechToTextStreaming = async (onTranscript) => {
  console.log('Initializing WebSocket connection...');
  
  let stream;
  let recorder;
  let socket;
  let retryCount = 0;
  const maxRetries = 3;

  const connect = async () => {
    try {
      console.log('�� Initializing audio stream...');
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      console.log('✅ Audio stream initialized');

      console.log('🔌 Connecting to Deepgram WebSocket...');
      socket = new WebSocket('wss://api.deepgram.com/v1/listen', [
        'token',
        DEEPGRAM_API_KEY,
      ]);

      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('WebSocket connection timeout'));
        }, 10000);

        socket.onopen = () => {
          clearTimeout(timeout);
          console.log('✅ WebSocket connected');
          resolve();
        };
      });

      const options = {
        model: "nova-2",
        punctuate: true,
        encoding: "linear16",
        channels: 1,
        sample_rate: 16000,
        language: "hi,en",
        smart_format: true,
        detect_language: true,
        interim_results: true,
        endpointing: 200,
        vad_events: true,
        diarize: false,
        profanity_filter: false,
        redact: false,
        multilingual: true
      };

      console.log('📝 Sending Deepgram options:', options);
      socket.send(JSON.stringify({ options }));

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          // Handle VAD events
          if (data.type === 'VADEvent') {
            console.log('�� VAD Event:', data.event);
            if (data.event === 'speech_start') {
              onTranscript({ speech_started: true });
              return;
            }
            if (data.event === 'speech_end') {
              onTranscript({ speech_ended: true });
              return;
            }
          }

          // Handle transcript
          const transcript = data.channel?.alternatives?.[0]?.transcript || '';
          if (transcript) {
            const result = {
              content: transcript,
              language: data.channel?.alternatives?.[0]?.language || 'en-US',
              isFinal: data.is_final || false,
              confidence: data.channel?.alternatives?.[0]?.confidence
            };
            
            console.log('📝 Transcript:', result);
            onTranscript(result);
          }
        } catch (error) {
          console.error('❌ Error processing WebSocket message:', error);
        }
      };

      socket.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
      };

      socket.onclose = (event) => {
        console.log('🔌 WebSocket closed:', event.code, event.reason);
      };

      // Initialize recorder
      console.log('🎙️ Initializing MediaRecorder...');
      recorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : 'audio/mp4',
        audioBitsPerSecond: 128000
      });

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0 && socket.readyState === WebSocket.OPEN) {
          socket.send(event.data);
        }
      };

      console.log('🎙️ Starting recorder...');
      recorder.start(50);
      console.log('✅ Recorder started');

    } catch (error) {
      console.error('❌ Setup error:', error, error.stack);
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      if (socket) {
        socket.close();
      }
      throw error;
    }
  };

  await connect();

  return {
    socket,
    recorder,
    stop: () => {
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.close();
      }
      if (recorder && recorder.state === 'recording') {
        recorder.stop();
      }
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    }
  };
}; 