<template>
  <div class="ai-refiner-card">
    <!-- Local AI model loading state -->
    <div class="ai-mode-panel">
      <div class="local-ai-status-container">
        <!-- Model Selector -->
        <div v-if="modelStatus === 'idle'" class="model-loader-prompt">
          <p class="info-alert" v-if="selectedModel === 'chrome-gemini-nano'">
            <strong>✨ Chrome組み込み AI (Gemini Nano) が利用可能です</strong><br />
            モデルファイルをダウンロードする必要がなく、PCのメモリ・バッテリー消費を抑えながら即時にスタイリング相談を開始できます。
          </p>
          <p class="warning-alert" v-else>
            <strong>⚠️ AIモデルのダウンロードについて（容量 約1.5GB）</strong><br />
            ブラウザ上で完全にプライベートにAI（Gemma 4）を実行するため、最初の1回のみモデルファイルをダウンロードします。高速なWi-Fi環境でのロードをおすすめします。（2回目以降はブラウザキャッシュから即座に起動します）
          </p>
          <div class="selector-row">
            <select v-model="selectedModel" class="model-select">
              <option v-if="isBuiltInAiSupported" value="chrome-gemini-nano">Chrome組み込み AI (Gemini Nano) [推奨]</option>
              <option value="onnx-community/gemma-4-E2B-it-ONNX">Gemma 4 E2B Instruct（Lite・高速推奨）</option>
              <option value="onnx-community/gemma-4-E4B-it-ONNX">Gemma 4 E4B Instruct（Smart・高性能）</option>
              <option value="onnx-community/gemma-4-E2B-it-qat-mobile-ONNX">Gemma 4 E2B QAT（モバイル最適化）</option>
            </select>
            <button @click="initLocalAi" class="btn btn-primary btn-sm">モデルを起動</button>
          </div>
        </div>

        <!-- Download progress -->
        <div v-else-if="modelStatus === 'loading'" class="loading-progress-block">
          <div class="spinner-row">
            <div class="double-bounce-spinner"></div>
            <span v-if="selectedModel === 'chrome-gemini-nano'">Chrome組み込み AI (Gemini Nano) を接続中...</span>
            <span v-else>AIモデルをダウンロード中（ブラウザ内保存）...</span>
          </div>
          <div class="progress-bar-container" v-if="selectedModel !== 'chrome-gemini-nano' || downloadProgress > 0">
            <div class="progress-bar-fill" :style="{ width: `${downloadProgress}%` }"></div>
          </div>
          <div class="progress-meta" v-if="selectedModel !== 'chrome-gemini-nano' || downloadProgress > 0">
            <span v-if="selectedModel === 'chrome-gemini-nano'">{{ downloadProgress }}%</span>
            <span v-else>{{ downloadProgress }}% ({{ formattedBytesLoaded }} / {{ formattedBytesTotal }})</span>
            <span class="current-file" v-if="selectedModel !== 'chrome-gemini-nano'">{{ currentFileName }}</span>
          </div>
        </div>

        <!-- Loaded status -->
        <div v-else-if="modelStatus === 'ready'" class="model-ready-badge">
          <div class="green-dot"></div>
          <span>ローカルAI起動中 ({{ selectedModel.split('/').pop() }})</span>
        </div>

        <!-- Error status -->
        <div v-else-if="modelStatus === 'error'" class="model-error-block">
          <p class="error-msg">エラー：{{ modelError }}</p>
          <button @click="modelStatus = 'idle'" class="btn btn-secondary btn-sm">再試行する</button>
        </div>
      </div>
    </div>

    <!-- User Refinement prompt -->
    <div class="prompt-section">
      <label for="refinement-input">コーディネートの雰囲気をどのように変えたいですか？</label>
      <div class="input-row">
        <input 
          id="refinement-input"
          v-model="userPrompt" 
          type="text" 
          placeholder="例：もっとシックにしたい、ビジネス用、明るく可愛い感じ..."
          @keydown="handleKeyDown"
          @compositionend="handleCompositionEnd"
          :disabled="isGenerating || !season || modelStatus !== 'ready'"
        />
        <button 
          @click="handleRefine" 
          class="btn btn-accent" 
          :disabled="isGenerating || !userPrompt || !season || modelStatus !== 'ready'"
        >
          <span v-if="isGenerating" class="generating-spinner"></span>
          <span v-else>相談する</span>
        </button>
      </div>

      <!-- Quick prompts recommendation -->
      <div class="quick-prompts">
        <button 
          v-for="p in quickPrompts" 
          :key="p"
          @click="userPrompt = p; handleRefine()"
          class="quick-btn"
          :disabled="isGenerating || !season || modelStatus !== 'ready'"
        >
          {{ p }}
        </button>
      </div>
    </div>

    <!-- Output log & JSON representation -->
    <div class="ai-output-box" v-if="aiConsoleLog.length > 0">
      <h3>AIスタイリスト分析ログ</h3>
      <div class="console-output">
        <div 
          v-for="(log, idx) in aiConsoleLog" 
          :key="idx" 
          class="console-line" 
          :class="log.type"
        >
          <span class="time">[{{ log.time }}]</span> {{ log.text }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onBeforeUnmount, computed, onMounted } from 'vue';

const props = defineProps({
  season: {
    type: String,
    default: ''
  },
  currentOutfit: {
    type: Object,
    default: () => ({ tops: null, bottoms: null, outer: null })
  },
  ownedItem: {
    type: Object,
    default: null
  },
  occasion: {
    type: String,
    default: 'friendly'
  }
});

const emit = defineEmits(['refineOutfit']);

const selectedModel = ref('onnx-community/gemma-4-E2B-it-ONNX');
const isBuiltInAiSupported = ref(false);
const builtInAiStatus = ref('unavailable');
const modelStatus = ref('idle'); // 'idle' | 'loading' | 'ready' | 'error'
const modelError = ref('');
const downloadProgress = ref(0);
const currentFileName = ref('');

// built-in AI detection
async function checkBuiltInAi() {
  if (typeof window === 'undefined') return 'unavailable';

  // 1. Modern spec (LanguageModel)
  if (typeof LanguageModel !== 'undefined' && typeof LanguageModel.availability === 'function') {
    try {
      return await LanguageModel.availability();
    } catch (e) {
      console.warn('LanguageModel.availability error:', e);
    }
  }

  // 2. Experimental/Older spec (window.ai)
  if (typeof window.ai !== 'undefined' && typeof window.ai.languageModel !== 'undefined') {
    try {
      const capabilities = await window.ai.languageModel.capabilities();
      return capabilities.available; // 'readily' | 'after-download' | 'no'
    } catch (e) {
      console.warn('window.ai capabilities error:', e);
    }
  }
  return 'unavailable';
}

onMounted(async () => {
  const availability = await checkBuiltInAi();
  builtInAiStatus.value = availability;
  if (availability !== 'unavailable' && availability !== 'no') {
    isBuiltInAiSupported.value = true;
    selectedModel.value = 'chrome-gemini-nano';
  }
});

const userPrompt = ref('');
const isGenerating = ref(false);
const aiConsoleLog = ref([]);
const lastPromptText = ref('');

const downloads = ref({});

const quickPrompts = [
  'もっとシックにしたい',
  'オフィスカジュアル',
  '明るくアクティブな印象に',
  'デート向けに可愛く',
  '大人っぽくダークトーンで'
];

let worker = null;

const formattedBytesLoaded = computed(() => formatBytes(Object.values(downloads.value).reduce((a, b) => a + (b.loaded || 0), 0)));
const formattedBytesTotal = computed(() => formatBytes(Object.values(downloads.value).reduce((a, b) => a + (b.total || 0), 0)));

function logConsole(type, text) {
  const time = new Date().toLocaleTimeString();
  aiConsoleLog.value.unshift({ type, text, time });
  if (aiConsoleLog.value.length > 20) {
    aiConsoleLog.value.pop();
  }
}

function initLocalAi() {
  try {
    modelStatus.value = 'loading';
    downloadProgress.value = 0;
    downloads.value = {};

    if (selectedModel.value === 'chrome-gemini-nano') {
      logConsole('system', 'Chrome組み込み AI (Gemini Nano) を接続中...');
      // Use LanguageModel to start download/initialization
      const initBuiltInSession = async () => {
        try {
          let testSession = null;
          if (typeof LanguageModel !== 'undefined') {
            testSession = await LanguageModel.create({
              monitor(m) {
                m.addEventListener('downloadprogress', (e) => {
                  const pct = Math.round((e.loaded / e.total) * 100);
                  downloadProgress.value = pct;
                  logConsole('system', `Gemini Nanoモデルをダウンロード中: ${pct}%`);
                });
              }
            });
          } else if (window.ai && window.ai.languageModel) {
            testSession = await window.ai.languageModel.create();
          }

          if (testSession) {
            testSession.destroy();
            modelStatus.value = 'ready';
            logConsole('success', 'Gemini Nanoが正常に接続されました。会話可能です。');
          } else {
            throw new Error('組み込みAIセッションの作成に失敗しました。');
          }
        } catch (err) {
          modelStatus.value = 'error';
          modelError.value = err.message;
          logConsole('error', `Gemini Nanoの起動に失敗しました: ${err.message}`);
        }
      };
      initBuiltInSession();
      return;
    }

    logConsole('system', `AIモデル ${selectedModel.value} をスレッドに読み込んでいます...`);

    const runtimeConfig = useRuntimeConfig();
    const workerUrl = `${runtimeConfig.app.baseURL || '/'}gemma-worker.js`.replace(/\/{2,}/g, '/');
    worker = new Worker(workerUrl, { type: 'module' });

    worker.onmessage = (event) => {
      const { type, data } = event.data;

      if (type === 'progress') {
        const { file, progress, loaded, total } = data;
        downloads.value[file] = { loaded, total };
        currentFileName.value = file.split('/').pop();

        const totalBytes = Object.values(downloads.value).reduce((acc, curr) => acc + (curr.total || 0), 0);
        const loadedBytes = Object.values(downloads.value).reduce((acc, curr) => acc + (curr.loaded || 0), 0);
        if (totalBytes > 0) {
          downloadProgress.value = Math.round((loadedBytes / totalBytes) * 100);
        }
      }

      if (type === 'status') {
        const { status, message, error } = data;
        if (status === 'ready') {
          modelStatus.value = 'ready';
          logConsole('success', `AIモデルがブラウザに正常にロードされました！会話可能です。`);
        } else if (status === 'error') {
          modelStatus.value = 'error';
          modelError.value = error;
          logConsole('error', `AI読み込みエラー: ${error}`);
        } else if (status === 'generating') {
          logConsole('ai', `AIスタイリストがあなたに似合う配色比率を再考しています...`);
        }
      }

      if (type === 'result') {
        isGenerating.value = false;
        logConsole('success', `AIが色の提案を完了しました。`);
        parseAiResponse(data);
      }
    };

    worker.postMessage({
      type: 'init',
      data: {
        modelName: selectedModel.value,
        device: 'webgpu'
      }
    });

  } catch (err) {
    modelStatus.value = 'error';
    modelError.value = err.message;
    logConsole('error', `ワーカーの起動に失敗しました: ${err.message}`);
  }
}

let lastCompositionEnd = 0;

function handleCompositionEnd() {
  lastCompositionEnd = Date.now();
}

function handleKeyDown(event) {
  if (event.key !== 'Enter') return;
  if (event.isComposing) return;
  if (Date.now() - lastCompositionEnd < 50) return;
  handleRefine();
}

function handleRefine() {
  if (!userPrompt.value || !props.season) return;

  const promptText = userPrompt.value.trim();
  logConsole('user', `相談内容: "${promptText}"`);

  runLocalAiRefiner(promptText);
  
  userPrompt.value = '';
}

function runRuleBasedRefiner(promptText) {
  isGenerating.value = true;
  logConsole('system', 'ルールベースによる高速調整を実行中...');
  
  setTimeout(() => {
    isGenerating.value = false;
    const lowerPrompt = promptText.toLowerCase();

    let newTops = { ...props.currentOutfit.tops };
    let newBottoms = { ...props.currentOutfit.bottoms };
    let newOuter = props.currentOutfit.outer ? { ...props.currentOutfit.outer } : null;

    // 1. 簡易カラー抽出 (フォールバック用)
    let detectedColor = null;
    if (lowerPrompt.includes('青') || lowerPrompt.includes('ブルー') || lowerPrompt.includes('blue')) {
      detectedColor = { name: 'ブルー', hex: '#2B6CB0' };
    } else if (lowerPrompt.includes('黒') || lowerPrompt.includes('ブラック') || lowerPrompt.includes('black')) {
      detectedColor = { name: 'ブラック', hex: '#1A202C' };
    } else if (lowerPrompt.includes('白') || lowerPrompt.includes('ホワイト') || lowerPrompt.includes('white')) {
      detectedColor = { name: 'ホワイト', hex: '#FAF9F6' };
    } else if (lowerPrompt.includes('ベージュ') || lowerPrompt.includes('beige')) {
      detectedColor = { name: 'ベージュ', hex: '#E5D3B3' };
    } else if (lowerPrompt.includes('赤') || lowerPrompt.includes('レッド') || lowerPrompt.includes('red')) {
      detectedColor = { name: 'レッド', hex: '#C53030' };
    } else if (lowerPrompt.includes('緑') || lowerPrompt.includes('グリーン') || lowerPrompt.includes('green')) {
      detectedColor = { name: 'グリーン', hex: '#2F855A' };
    } else if (lowerPrompt.includes('黄') || lowerPrompt.includes('イエロー') || lowerPrompt.includes('yellow')) {
      detectedColor = { name: 'イエロー', hex: '#D69E2E' };
    } else if (lowerPrompt.includes('グレー') || lowerPrompt.includes('gray') || lowerPrompt.includes('grey')) {
      detectedColor = { name: 'グレー', hex: '#718096' };
    }

    if (detectedColor) {
      let isItemSpecified = false;

      if (lowerPrompt.includes('シャツ') || lowerPrompt.includes('トップス') || lowerPrompt.includes('服') || lowerPrompt.includes('上着')) {
        newTops = { name: `${detectedColor.name}トップス`, hex: detectedColor.hex };
        isItemSpecified = true;
        if (detectedColor.name === 'ブルー' || detectedColor.name === 'ブラック') {
          newBottoms = { name: 'ホワイトボトムス', hex: '#FAF9F6' };
        } else {
          newBottoms = { name: 'グレーボトムス', hex: '#4A5568' };
        }
      } else if (lowerPrompt.includes('パンツ') || lowerPrompt.includes('ズボン') || lowerPrompt.includes('ボトム') || lowerPrompt.includes('スカート')) {
        newBottoms = { name: `${detectedColor.name}ボトムス`, hex: detectedColor.hex };
        isItemSpecified = true;
        if (detectedColor.name === 'ブラック' || detectedColor.name === 'ブルー') {
          newTops = { name: 'ホワイトトップス', hex: '#FAF9F6' };
        } else {
          newTops = { name: 'ネイビーシャツ', hex: '#1A365D' };
        }
      } else if (newOuter && (lowerPrompt.includes('アウター') || lowerPrompt.includes('コート') || lowerPrompt.includes('ジャケット') || lowerPrompt.includes('羽織'))) {
        newOuter = { name: `${detectedColor.name}アウター`, hex: detectedColor.hex };
        isItemSpecified = true;
      }

      if (!isItemSpecified) {
        newTops = { name: `${detectedColor.name}トップス`, hex: detectedColor.hex };
        if (detectedColor.name === 'ブルー' || detectedColor.name === 'ブラック') {
          newBottoms = { name: 'ホワイトボトムス', hex: '#FAF9F6' };
        } else {
          newBottoms = { name: 'グレーボトムス', hex: '#4A5568' };
        }
      }

      emit('refineOutfit', {
        tops: newTops,
        bottoms: newBottoms,
        outer: newOuter
      });
      logConsole('success', `フォールバック調整: 「${detectedColor.name}」指定に基づいてコーディネートを設定しました。`);
      return;
    }

    let topsHsl = hexToHsl(newTops.hex);
    let bottomsHsl = hexToHsl(newBottoms.hex);
    let outerHsl = newOuter ? hexToHsl(newOuter.hex) : null;

    if (lowerPrompt.includes('シック') || lowerPrompt.includes('chic') || lowerPrompt.includes('落ち着いた')) {
      topsHsl.l = Math.max(0.2, topsHsl.l - 0.20);
      topsHsl.s = Math.max(0.1, topsHsl.s - 0.15);
      bottomsHsl.l = Math.max(0.15, bottomsHsl.l - 0.15);
      bottomsHsl.s = Math.max(0.08, bottomsHsl.s - 0.10);
      newTops.name = `シックな${newTops.name}`;
      newBottoms.name = `シックな${newBottoms.name}`;
      
      if (newOuter) {
        outerHsl.l = Math.max(0.12, outerHsl.l - 0.20);
        outerHsl.s = Math.max(0.08, outerHsl.s - 0.10);
        newOuter.name = `シックな${newOuter.name}`;
      }
    } else if (lowerPrompt.includes('明るい') || lowerPrompt.includes('bright') || lowerPrompt.includes('華やか') || lowerPrompt.includes('アクティブ') || lowerPrompt.includes('明るく')) {
      topsHsl.l = Math.min(0.85, topsHsl.l + 0.15);
      topsHsl.s = Math.min(0.9, topsHsl.s + 0.15);
      bottomsHsl.l = Math.min(0.80, bottomsHsl.l + 0.10);
      bottomsHsl.s = Math.min(0.85, bottomsHsl.s + 0.10);
      newTops.name = `明るい${newTops.name}`;
      newBottoms.name = `明るい${newBottoms.name}`;
      
      if (newOuter) {
        outerHsl.l = Math.min(0.85, outerHsl.l + 0.15);
        outerHsl.s = Math.min(0.85, outerHsl.s + 0.10);
        newOuter.name = `明るい${newOuter.name}`;
      }
    } else if (lowerPrompt.includes('ビジネス') || lowerPrompt.includes('business') || lowerPrompt.includes('カジュアル') || lowerPrompt.includes('オフィス')) {
      newTops = { name: 'オフィスクリーム', hex: '#FAF9F6' };
      newBottoms = { name: 'オフィスネイビー', hex: '#2A3439' };
      if (newOuter) {
        newOuter = { name: 'オフィスベージュ', hex: '#D8C3A5' };
      }
      topsHsl = hexToHsl(newTops.hex);
      bottomsHsl = hexToHsl(newBottoms.hex);
      if (newOuter) outerHsl = hexToHsl(newOuter.hex);
    } else if (lowerPrompt.includes('可愛い') || lowerPrompt.includes('cute') || lowerPrompt.includes('デート')) {
      topsHsl.l = 0.78;
      topsHsl.s = 0.55;
      bottomsHsl.l = 0.70;
      bottomsHsl.s = 0.40;
      newTops.name = `甘いマイルドな${newTops.name}`;
      newBottoms.name = `甘いマイルドな${newBottoms.name}`;
      
      if (newOuter) {
        outerHsl.l = 0.75;
        outerHsl.s = 0.45;
        newOuter.name = `可愛らしい${newOuter.name}`;
      }
    } else {
      const tempHex = newTops.hex;
      newTops.hex = newBottoms.hex;
      newBottoms.hex = tempHex;
      
      const tempName = newTops.name;
      newTops.name = newBottoms.name;
      newBottoms.name = tempName;
      
      topsHsl = hexToHsl(newTops.hex);
      bottomsHsl = hexToHsl(newBottoms.hex);
    }

    if (newTops.hex.startsWith('#') && (lowerPrompt.includes('chic') || lowerPrompt.includes('シック') || lowerPrompt.includes('bright') || lowerPrompt.includes('明るい') || lowerPrompt.includes('可愛い') || lowerPrompt.includes('cute') || lowerPrompt.includes('明るく'))) {
      newTops.hex = hslToHex(topsHsl.h, topsHsl.s, topsHsl.l);
      newBottoms.hex = hslToHex(bottomsHsl.h, bottomsHsl.s, bottomsHsl.l);
      if (newOuter && outerHsl) {
        newOuter.hex = hslToHex(outerHsl.h, outerHsl.s, outerHsl.l);
      }
    }
    if (props.ownedItem) {
      if (props.ownedItem.category === 'tops') {
        newTops = { name: '手持ちのトップス', hex: props.ownedItem.hex };
      } else if (props.ownedItem.category === 'bottoms') {
        newBottoms = { name: '手持ちのボトムス', hex: props.ownedItem.hex };
      } else if (props.ownedItem.category === 'outer' && newOuter) {
        newOuter = { name: '手持ちのアウター', hex: props.ownedItem.hex };
      }
    }

    emit('refineOutfit', {
      tops: newTops,
      bottoms: newBottoms,
      outer: newOuter
    });
    logConsole('success', `プロンプトキーワードに合わせて色相調整を適用しました。`);
  }, 600);
}

function runLocalAiRefiner(promptText) {
  if (selectedModel.value === 'chrome-gemini-nano') {
    if (modelStatus.value !== 'ready') {
      logConsole('error', 'Gemini Nanoが起動されていません。モデルを起動してください。');
      alert('Gemini Nanoが準備できていません。モデルを起動してください。');
      return;
    }
  } else {
    if (!worker || modelStatus.value !== 'ready') {
      logConsole('error', 'ローカルAIモデルが初期化されていません。モデルを先に起動してください。');
      alert('ローカルモデルが準備できていません。モデルをロードしてください。');
      return;
    }
  }

  isGenerating.value = true;
  lastPromptText.value = promptText;
  
  const topsDesc = `${props.currentOutfit.tops?.name} (${props.currentOutfit.tops?.hex})`;
  const bottomsDesc = `${props.currentOutfit.bottoms?.name} (${props.currentOutfit.bottoms?.hex})`;
  const outerDesc = props.currentOutfit.outer ? `${props.currentOutfit.outer?.name} (${props.currentOutfit.outer?.hex})` : 'None';

  let ownedConstraint = '';
  if (props.ownedItem) {
    const categoryName = props.ownedItem.category === 'tops' ? 'Tops' : props.ownedItem.category === 'bottoms' ? 'Bottoms' : 'Outer';
    ownedConstraint = `\nCRITICAL CONSTRAINT: The user's ${categoryName} is a fixed physical item they own with the color ${props.ownedItem.hex}. You MUST NOT change the color of the ${categoryName}. Keep the ${categoryName} exactly as {"hex": "${props.ownedItem.hex}"}. Only modify other items to match this fixed color.`;
  }

  let occasionPrompt = '';
  if (props.occasion === 'business') {
    occasionPrompt = '\nUser Occasion Context: Business / Formal. Target impressions: Trustworthy, professional, clean. Favor dark navy, gray, off-white, and moderate contrast. Avoid neon or excessively bright colors.';
  } else if (props.occasion === 'friendly') {
    occasionPrompt = '\nUser Occasion Context: Friendly / Casual. Target impressions: Approachable, cheerful, happy. Favor bright, warm shades, medium saturation, soft pastels. Avoid extremely dark, gloomy colors.';
  } else if (props.occasion === 'elegant') {
    occasionPrompt = '\nUser Occasion Context: Elegant / Date. Target impressions: Sophisticated, classy, chic. Favor deep/dark shades (black, deep red, violet, royal blue), high value contrast, sleek clean combinations.';
  } else if (props.occasion === 'relaxed') {
    occasionPrompt = '\nUser Occasion Context: Relaxed / Natural. Target impressions: Calm, organic, natural. Favor earth tones (beiges, browns, olive greens, safaris), low-to-medium saturation. Avoid vivid neon and stark black/white contrasts.';
  }

  const systemPrompt = `You are a fashion color stylist AI.
User personal color season: ${props.season}
Current Outfit:
- Tops: ${topsDesc}
- Bottoms: ${bottomsDesc}
- Outer: ${outerDesc}
${ownedConstraint}
${occasionPrompt}

User requests adjustment: "${promptText}"

When recommending new matching hex colors fitting the user's personal color season (${props.season}), adhere to the following styling concepts if applicable:
1. For "シック" (chic), "落ち着いた" (calm), "ダーク" (dark) requests:
   - Lower the brightness and saturation of the current colors to create a sophisticated, muted look.
2. For "明るい" (bright), "華やか" (vivid), "アクティブ" (active) requests:
   - Increase the brightness and saturation to create an energetic, lively look.
3. For "ビジネス" (business), "オフィス" (office), "フォーマル" (formal) requests:
   - Suggest clean, neat combinations such as Off-white (#FAF9F6), Navy (#2A3439), or Beige (#D8C3A5).
4. For "可愛い" (cute), "デート" (date) requests:
   - Suggest soft pastel-like colors with medium-to-high brightness and moderate saturation (sweet, mild tones).
5. If the user specifies a color for a specific item (e.g., "blue shirt/tops", "black pants/bottoms", "beige outer"), you MUST prioritize setting that item to the requested color (choosing a specific shade/hex that strictly matches the user's personal color season: ${props.season}), and then recommend matching, coordinated colors for the remaining items.
6. If the request does not match any specific keywords or items, intelligently perform color shifts matching the requested nuance while strictly respecting the ${props.season} personal color palette constraints.

Respond ONLY with a valid raw JSON block (do not write markdown, do not write code blocks, do not explain):
{
  "tops": { "name": "Color Name", "hex": "#HEX" },
  "bottoms": { "name": "Color Name", "hex": "#HEX" }
  ${props.currentOutfit.outer ? ',"outer": { "name": "Color Name", "hex": "#HEX" }' : ''}
}`;

  if (selectedModel.value === 'chrome-gemini-nano') {
    runBuiltInAi(systemPrompt);
    return;
  }

  logConsole('system', `Gemma 4 にプロンプト命令を送信中...`);
  worker.postMessage({
    type: 'generate',
    data: {
      prompt: systemPrompt,
      maxTokens: 150,
      temperature: 0.5
    }
  });
}

async function runBuiltInAi(systemPrompt) {
  let session = null;
  try {
    logConsole('system', 'Chrome組み込みGemini Nanoでセッションを作成中...');
    
    if (typeof LanguageModel !== 'undefined') {
      session = await LanguageModel.create();
    } else if (window.ai && window.ai.languageModel) {
      session = await window.ai.languageModel.create();
    }

    if (!session) {
      throw new Error('Chrome組み込みAIのセッション作成に失敗しました。');
    }

    logConsole('ai', 'Gemini Nanoに接続しました。スタイリングの調整をリクエスト中...');

    // Attempt using constraint schema if supported
    const schema = {
      type: 'object',
      properties: {
        tops: {
          type: 'object',
          properties: { name: { type: 'string' }, hex: { type: 'string' } },
          required: ['name', 'hex']
        },
        bottoms: {
          type: 'object',
          properties: { name: { type: 'string' }, hex: { type: 'string' } },
          required: ['name', 'hex']
        },
        ...(props.currentOutfit.outer ? {
          outer: {
            type: 'object',
            properties: { name: { type: 'string' }, hex: { type: 'string' } },
            required: ['name', 'hex']
          }
        } : {})
      },
      required: ['tops', 'bottoms', ...(props.currentOutfit.outer ? ['outer'] : [])]
    };

    let resultText = '';
    try {
      resultText = await session.prompt(systemPrompt, { responseConstraint: schema });
    } catch (constraintError) {
      console.warn('Schema constraint failed or unsupported, falling back to plain prompt:', constraintError);
      resultText = await session.prompt(systemPrompt);
    }

    isGenerating.value = false;
    logConsole('success', 'Gemini Nanoが提案を完了しました。');
    parseAiResponse(resultText);

  } catch (error) {
    console.error('Gemini Nano error:', error);
    modelStatus.value = 'error';
    modelError.value = error.message;
    logConsole('error', `Gemini Nanoエラー: ${error.message}。モデルステータスをエラーに更新しました。ルールベースの簡易調整にフォールバックします。`);
    runRuleBasedRefiner(lastPromptText.value);
  } finally {
    if (session && typeof session.destroy === 'function') {
      session.destroy();
    }
  }
}

function parseAiResponse(text) {
  try {
    logConsole('system', `受信テキストを解析中:\n${text}`);
    
    const startIdx = text.indexOf('{');
    const endIdx = text.lastIndexOf('}');
    if (startIdx === -1 || endIdx === -1 || endIdx < startIdx) {
      throw new Error('JSONブロックが見つかりません。');
    }
    
    const jsonStr = text.slice(startIdx, endIdx + 1);
    const parsed = JSON.parse(jsonStr);
    if (!parsed.tops || !parsed.bottoms || (!parsed.outer && props.currentOutfit.outer)) {
      throw new Error('出力されたJSONに必要な色定義が不足しています。');
    }
    
    let finalTops = { name: parsed.tops.name, hex: parsed.tops.hex };
    let finalBottoms = { name: parsed.bottoms.name, hex: parsed.bottoms.hex };
    let finalOuter = parsed.outer ? { name: parsed.outer.name, hex: parsed.outer.hex } : null;

    if (props.ownedItem) {
      if (props.ownedItem.category === 'tops') {
        finalTops = { name: '手持ちのトップス', hex: props.ownedItem.hex };
      } else if (props.ownedItem.category === 'bottoms') {
        finalBottoms = { name: '手持ちのボトムス', hex: props.ownedItem.hex };
      } else if (props.ownedItem.category === 'outer' && finalOuter) {
        finalOuter = { name: '手持ちのアウター', hex: props.ownedItem.hex };
      }
    }

    emit('refineOutfit', {
      tops: finalTops,
      bottoms: finalBottoms,
      outer: finalOuter
    });
    
    logConsole('success', `ローカルAIの提案内容に基づき、コーディネートを調整しました。`);
  } catch (err) {
    logConsole('error', `AI応答解析失敗: ${err.message}。簡易エンジンにフォールバックします。`);
    runRuleBasedRefiner(lastPromptText.value || 'gentle shift');
  }
}

function hexToHsl(hex) {
  let r = parseInt(hex.slice(1, 3), 16) / 255;
  let g = parseInt(hex.slice(3, 5), 16) / 255;
  let b = parseInt(hex.slice(5, 7), 16) / 255;

  let max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;

  if (max === min) {
    h = s = 0;
  } else {
    let d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return { h: Math.round(h * 360), s, l };
}

function hslToHex(h, s, l) {
  let r, g, b;
  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    h /= 360;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }
  const toHex = x => {
    const hex = Math.round(x * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

onBeforeUnmount(() => {
  if (worker) {
    worker.terminate();
  }
});
</script>

<style scoped>
.ai-refiner-card {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  width: 100%;
}

.ai-mode-panel {
  background: rgba(0, 0, 0, 0.015);
  border: 1px solid rgba(0, 0, 0, 0.04);
  border-radius: 8px;
  padding: 1rem;
}

.mode-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.mode-title {
  font-size: 0.85rem;
  font-weight: bold;
  color: var(--text-muted);
}

.engine-selector {
  display: flex;
  background: rgba(0, 0, 0, 0.05);
  padding: 2px;
  border-radius: 6px;
}

.engine-btn {
  background: transparent;
  border: none;
  font-size: 0.75rem;
  color: var(--text-muted);
  padding: 0.35rem 0.65rem;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.engine-btn.active {
  background: var(--accent);
  color: white;
  font-weight: bold;
}

.local-ai-status-container {
  margin-top: 1rem;
  padding-top: 0.85rem;
  border-top: 1px dashed rgba(0, 0, 0, 0.06);
}

.warning-alert {
  font-size: 0.75rem;
  line-height: 1.45;
  color: #b45309; 
  background: #fef3c7;
  border-left: 2px solid #fbbf24;
  padding: 0.5rem 0.75rem;
  border-radius: 4px;
  margin-bottom: 0.75rem;
}

.info-alert {
  font-size: 0.75rem;
  line-height: 1.45;
  color: #1e3a8a; 
  background: #eff6ff;
  border-left: 2px solid #3b82f6;
  padding: 0.5rem 0.75rem;
  border-radius: 4px;
  margin-bottom: 0.75rem;
}

.selector-row {
  display: flex;
  gap: 0.5rem;
}

.model-select {
  flex-grow: 1;
  background: #fff;
  border: 1px solid rgba(0, 0, 0, 0.1);
  color: var(--text-color);
  border-radius: 6px;
  padding: 0.4rem;
  font-size: 0.8rem;
  outline: none;
}

.btn-sm {
  padding: 0.4rem 0.8rem;
  font-size: 0.8rem;
}

.loading-progress-block {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.spinner-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.8rem;
  color: var(--text-muted);
}

.double-bounce-spinner {
  width: 14px;
  height: 14px;
  border: 2px solid var(--accent);
  border-top-color: transparent;
  border-radius: 50%;
  animation: spin 1s infinite linear;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.progress-bar-container {
  width: 100%;
  height: 6px;
  background: rgba(0, 0, 0, 0.05);
  border-radius: 10px;
  overflow: hidden;
}

.progress-bar-fill {
  height: 100%;
  background: var(--accent);
  transition: width 0.3s ease;
}

.progress-meta {
  display: flex;
  justify-content: space-between;
  font-size: 0.7rem;
  color: var(--text-muted);
}

.current-file {
  max-width: 180px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.model-ready-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.8rem;
  color: #16a34a;
}

.green-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: #16a34a;
  box-shadow: 0 0 8px rgba(22, 163, 74, 0.4);
}

.model-error-block {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.error-msg {
  font-size: 0.8rem;
  color: #dc2626;
}

.prompt-section {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.prompt-section label {
  font-size: 0.85rem;
  color: var(--text-muted);
  font-weight: 600;
}

.input-row {
  display: flex;
  gap: 0.5rem;
}

.input-row input {
  flex-grow: 1;
  background: rgba(0, 0, 0, 0.015);
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 8px;
  padding: 0.75rem 1rem;
  color: var(--text-color);
  font-size: 0.9rem;
  outline: none;
  transition: border 0.2s ease;
}

.input-row input:focus {
  border-color: var(--primary);
  background: #fff;
}

.quick-prompts {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin-top: 0.25rem;
}

.quick-btn {
  background: rgba(0, 0, 0, 0.015);
  border: 1px solid rgba(0, 0, 0, 0.05);
  color: var(--text-muted);
  font-size: 0.75rem;
  padding: 0.35rem 0.65rem;
  border-radius: 20px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.quick-btn:hover:not(:disabled) {
  background: rgba(0, 0, 0, 0.04);
  border-color: rgba(0, 0, 0, 0.1);
  color: var(--text-color);
}

.generating-spinner {
  display: inline-block;
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255,255,255,0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 1s infinite linear;
}

.ai-output-box {
  border-top: 1px solid rgba(0, 0, 0, 0.05);
  padding-top: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.ai-output-box h3 {
  font-size: 0.85rem;
  color: var(--text-muted);
  font-weight: bold;
}

.console-output {
  background: #f1f0ec;
  border: 1px solid rgba(0, 0, 0, 0.06);
  border-radius: 8px;
  padding: 0.75rem;
  height: 120px;
  overflow-y: auto;
  font-family: var(--font-mono);
  font-size: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.console-line {
  line-height: 1.4;
}

.console-line.system { color: #6b7280; }
.console-line.user { color: var(--accent); }
.console-line.ai { color: #2563eb; }
.console-line.success { color: #16a34a; }
.console-line.error { color: #dc2626; }

.console-line .time {
  opacity: 0.5;
  margin-right: 0.35rem;
}
</style>
