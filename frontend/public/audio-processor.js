// audio-processor.js
class AudioProcessor extends AudioWorkletProcessor {
    process(inputs, outputs) {
      // Get the first input channel (mono audio)
      const input = inputs[0];
      if (input && input.length > 0) {
        // Send the audio data to the main thread
        this.port.postMessage(input[0]);
      }
      // Keep the processor alive
      return true;
    }
  }
  
  // Register the custom audio processor
  registerProcessor('audio-processor', AudioProcessor);