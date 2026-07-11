// public/gemma-worker.js

import { Engine } from 'https://cdn.jsdelivr.net/npm/@litert-lm/core/+esm';

let engine = null;
let chat = null;
let currentModelName = '';

self.onmessage = async (event) => {
  const { type, data } = event.data;

  if (type === 'init') {
    const { modelName } = data;
    try {
      if (engine && currentModelName === modelName) {
        self.postMessage({ type: 'status', data: { status: 'ready', message: 'LiteRT engine already initialized.' } });
        return;
      }

      currentModelName = modelName;
      
      // Determine model URL dynamically mapping litert-community repos
      let modelUrl = modelName;
      if (!modelName.startsWith('http')) {
        const folder = modelName.split('/').pop();
        const filename = folder.replace(/-litert-lm$/, '-web.litertlm');
        modelUrl = `https://huggingface.co/litert-community/${folder}/resolve/main/${filename}`;
      }

      self.postMessage({ type: 'status', data: { status: 'loading', progress: 0, message: 'Downloading LiteRT model...' } });

      // Start custom download tracking progress
      const response = await fetch(modelUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch LiteRT model: ${response.statusText}`);
      }

      const contentLengthHeader = response.headers.get('Content-Length');
      const contentLength = contentLengthHeader ? parseInt(contentLengthHeader, 10) : 0;

      const reader = response.body.getReader();
      let receivedLength = 0;
      const chunks = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        chunks.push(value);
        receivedLength += value.length;

        if (contentLength > 0) {
          const progress = Math.round((receivedLength / contentLength) * 100);
          self.postMessage({
            type: 'progress',
            data: {
              file: modelUrl,
              progress: progress,
              loaded: receivedLength,
              total: contentLength
            }
          });
        }
      }

      self.postMessage({ type: 'status', data: { status: 'loading', progress: 100, message: 'Compiling model with WebGPU...' } });

      const modelBlob = new Blob(chunks);
      const blobUrl = URL.createObjectURL(modelBlob);

      // Initialize LiteRT engine
      engine = await Engine.create({
        model: blobUrl,
        mainExecutorSettings: {
          maxNumTokens: 2048,
        }
      });

      // Free up resource pointer URL
      URL.revokeObjectURL(blobUrl);
      chat = null;

      self.postMessage({ type: 'status', data: { status: 'ready', message: 'LiteRT Engine initialized successfully.' } });
    } catch (error) {
      console.error('Failed to initialize LiteRT model in worker:', error);
      self.postMessage({ type: 'status', data: { status: 'error', error: error.message } });
    }
  }

  if (type === 'generate') {
    if (!engine) {
      self.postMessage({ type: 'status', data: { status: 'error', error: 'LiteRT Engine not initialized.' } });
      return;
    }

    const { prompt } = data;

    try {
      self.postMessage({ type: 'status', data: { status: 'generating' } });

      // Create a fresh conversation to avoid context leaks between styling requests
      chat = await engine.createConversation({
        preface: {
          messages: []
        }
      });

      let responseText = '';
      const stream = chat.sendMessageStreaming(prompt);
      for await (const chunk of stream) {
        if (chunk.content && chunk.content[0] && chunk.content[0].text) {
          responseText += chunk.content[0].text;
        }
      }

      self.postMessage({ type: 'result', data: responseText });
    } catch (error) {
      console.error('Generation error in LiteRT worker:', error);
      self.postMessage({ type: 'status', data: { status: 'error', error: error.message } });
    }
  }
};
