// public/gemma-worker.js

import {
  AutoProcessor,
  Gemma4ForConditionalGeneration,
  env
} from 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.2.0';

// Config CDN paths for ONNX runtime files to ensure standard in-browser behavior
env.allowLocalModels = false;

let processor = null;
let model = null;
let currentModelName = '';

self.onmessage = async (event) => {
  const { type, data } = event.data;

  if (type === 'init') {
    const { modelName, device } = data;
    try {
      if (model && processor && currentModelName === modelName) {
        self.postMessage({ type: 'status', data: { status: 'ready', message: 'Model already loaded.' } });
        return;
      }

      self.postMessage({ type: 'status', data: { status: 'loading', progress: 0, message: 'Initializing processor...' } });

      currentModelName = modelName;

      // Load processor
      processor = await AutoProcessor.from_pretrained(modelName);

      self.postMessage({ type: 'status', data: { status: 'loading', progress: 0, message: 'Initializing model...' } });

      // Load Gemma 4 model with WebGPU and quantized format
      let dtype;
      if (modelName.includes('-qat-mobile')) {
        dtype = {
          embed_tokens: 'q2f16',
          audio_encoder: 'q2f16',
          vision_encoder: 'fp16',
          decoder_model_merged: 'q2f16'
        };
      } else {
        dtype = 'q4f16';
      }
      model = await Gemma4ForConditionalGeneration.from_pretrained(modelName, {
        dtype: dtype,
        device: device || 'webgpu',
        progress_callback: (progressData) => {
          if (progressData.status === 'progress') {
            self.postMessage({
              type: 'progress',
              data: {
                file: progressData.file,
                progress: progressData.progress,
                loaded: progressData.loaded,
                total: progressData.total
              }
            });
          }
        }
      });

      self.postMessage({ type: 'status', data: { status: 'ready', message: `Model ${modelName} loaded successfully on ${device || 'webgpu'}.` } });
    } catch (error) {
      console.error('Failed to initialize model in worker:', error);
      self.postMessage({ type: 'status', data: { status: 'error', error: error.message } });
    }
  }

  if (type === 'generate') {
    if (!model || !processor) {
      self.postMessage({ type: 'status', data: { status: 'error', error: 'Model or processor not loaded.' } });
      return;
    }

    const { prompt, maxTokens, temperature } = data;
    let inputs = null;
    let outputs = null;

    try {
      self.postMessage({ type: 'status', data: { status: 'generating' } });

      // Format messages into chat template
      const messages = [{ role: 'user', content: [{ type: 'text', text: prompt }] }];
      const formattedPrompt = await processor.apply_chat_template(messages, {
        add_generation_prompt: true,
        tokenize: false
      });

      // Tokenize the formatted prompt
      inputs = await processor(formattedPrompt);

      // Generate response tokens
      outputs = await model.generate({
        ...inputs,
        max_new_tokens: maxTokens || 150,
        do_sample: false, // Greedy search works best for JSON structure extraction
      });

      // Decode the generated tokens
      const decoded = processor.batch_decode(
        outputs.slice(null, [inputs.input_ids.dims.at(-1), null]),
        { skip_special_tokens: true }
      );

      const responseText = decoded[0] || '';
      self.postMessage({ type: 'result', data: responseText });
    } catch (error) {
      console.error('Generation error in worker:', error);
      self.postMessage({ type: 'status', data: { status: 'error', error: error.message } });
    } finally {
      // Essential WebGPU resource cleanup
      if (inputs) {
        Object.values(inputs).forEach((tensor) => {
          if (tensor && typeof tensor.dispose === 'function') tensor.dispose();
        });
      }
      if (outputs && typeof outputs.dispose === 'function') {
        outputs.dispose();
      }
    }
  }
};
