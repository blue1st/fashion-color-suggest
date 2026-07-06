<template>
  <div class="own-item-scanner-card">
    <div class="scanner-instruction">
      <p>お手持ちの服（Tシャツやパンツなど）を登録して、それに合わせたコーディネートを提案します。</p>
    </div>

    <!-- Category Selector -->
    <div class="config-section">
      <span class="section-label">1. 登録するアイテムの種類：</span>
      <div class="category-grid">
        <button 
          v-for="cat in categories" 
          :key="cat.id" 
          @click="selectedCategory = cat.id"
          class="category-btn" 
          :class="{ active: selectedCategory === cat.id }"
        >
          <span class="icon">{{ cat.icon }}</span>
          <span class="label">{{ cat.name }}</span>
        </button>
      </div>
    </div>

    <!-- Color Input Mode Toggles -->
    <div class="config-section">
      <span class="section-label">2. 色の測定方法：</span>
      <div class="toggle-buttons">
        <button 
          @click="setInputMode('camera')" 
          class="toggle-btn" 
          :class="{ active: inputMode === 'camera' }"
        >
          📷 カメラでスキャン
        </button>
        <button 
          @click="setInputMode('picker')" 
          class="toggle-btn" 
          :class="{ active: inputMode === 'picker' }"
        >
          🎨 カラーピッカーで指定
        </button>
      </div>
    </div>

    <!-- CAMERA MODE SCREEN -->
    <div v-if="inputMode === 'camera'" class="camera-module">
      <div class="camera-wrapper">
        <div class="video-container" :class="{ 'has-captured': isCaptured }">
          <video 
            ref="videoRef" 
            autoplay 
            playsinline 
            muted 
            class="webcam-feed"
            v-show="!isCaptured && streamActive"
          ></video>
          <canvas 
            ref="canvasRef" 
            class="snapshot-canvas" 
            v-show="isCaptured || !streamActive"
          ></canvas>

          <!-- Guide overlay -->
          <div v-if="!isCaptured && streamActive" class="item-guide">
            <div class="guide-circle"></div>
            <p class="guide-text">服の平らな部分を円の中に大きく映してください</p>
          </div>
        </div>

        <!-- Live color indicator -->
        <div class="status-overlay" v-if="streamActive || isCaptured">
          <div class="swatch-info">
            <span class="label">スキャンした色:</span>
            <div class="color-indicator-row">
              <div class="color-circle" :style="{ backgroundColor: selectedHex }"></div>
              <span class="hex-text">{{ selectedHex }}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="controls-row">
        <button 
          v-if="!streamActive && !isCaptured" 
          @click="startCamera" 
          class="btn btn-primary"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 7l-7 5 7 5V7z"></path><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>
          カメラを起動
        </button>

        <template v-else>
          <button 
            @click="captureColor" 
            class="btn btn-accent" 
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="3"></circle></svg>
            {{ isCaptured ? 'スキャンし直す' : '色をキャプチャする' }}
          </button>
          
          <button 
            @click="stopCamera" 
            class="btn btn-secondary"
          >
            カメラを停止
          </button>
        </template>
      </div>
    </div>

    <!-- PICKER MODE SCREEN -->
    <div v-else class="picker-module">
      <div class="picker-container glass-panel">
        <div class="picker-row">
          <label class="color-picker-label">
            <input type="color" v-model="selectedHex" class="native-color-picker" />
            <span class="picker-swatch" :style="{ backgroundColor: selectedHex }"></span>
            <span class="picker-instructions">タップして色を選択してください</span>
          </label>
          <div class="hex-display-box">
            <span class="label">選択中のカラーコード</span>
            <input type="text" v-model="selectedHex" class="hex-input-text" @input="onHexTextInput" />
          </div>
        </div>
      </div>
    </div>

    <!-- ANALYSIS RESULTS -->
    <div v-if="selectedHex && isAnalyzed" class="analysis-section" :key="selectedHex">
      <h3 class="section-title">📊 カラー相性分析</h3>
      
      <!-- Hard/Challenging Outfit Alert Warning -->
      <div v-if="compatibility.level === 'challenging'" class="compatibility-alert challenging">
        <div class="alert-icon">⚠️</div>
        <div class="alert-body">
          <h4>【調和難易度 SSS級】組み合わせ注意のアラート</h4>
          <p class="alert-text">{{ compatibility.advice }}</p>
        </div>
      </div>

      <!-- Warning Alert -->
      <div v-else-if="compatibility.level === 'careful'" class="compatibility-alert careful">
        <div class="alert-icon">💡</div>
        <div class="alert-body">
          <h4>【コーディネートに一工夫必要】</h4>
          <p class="alert-text">{{ compatibility.advice }}</p>
        </div>
      </div>

      <!-- Success / Great match -->
      <div v-else class="compatibility-alert success">
        <div class="alert-icon">✨</div>
        <div class="alert-body">
          <h4>【相性バツグンのカラーです！】</h4>
          <p class="alert-text">{{ compatibility.advice }}</p>
        </div>
      </div>

      <!-- SUGGESTION COORDINATION PREVIEW -->
      <div class="suggestion-preview-area">
        <h4>👚 このアイテムを活かす配色サジェスト</h4>
        <p class="sub-desc">手持ちのアイテムを軸に、色彩理論で美しく調和する組み合わせを算出しました：</p>
        
        <div class="suggested-layout">
          <!-- Suggested Outfit Grid -->
          <div 
            v-for="(item, key) in suggestedOutfit" 
            :key="key" 
            class="suggested-card"
            :class="{ 'is-owned': key === selectedCategory }"
          >
            <div class="card-swatch" :style="{ backgroundColor: item?.hex }">
              <span v-if="key === selectedCategory" class="owned-tag">手持ち</span>
            </div>
            <div class="card-info">
              <span class="part-name">{{ getPartDisplayName(key) }}</span>
              <span class="color-name">{{ item?.name || '無彩色' }}</span>
              <span class="color-hex">{{ item?.hex }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Apply to Mannequin / Coordination button -->
      <div class="actions-row">
        <button @click="applyOutfitToApp" class="btn btn-primary apply-btn">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
          この組み合わせをマネキンに適用して次へ進む
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onBeforeUnmount, computed } from 'vue';

const props = defineProps({
  season: {
    type: String,
    required: true
  }
});

const emit = defineEmits(['itemRegistered', 'requestNextStep']);

const categories = [
  { id: 'tops', name: 'トップス（Tシャツ等）', icon: '👕' },
  { id: 'bottoms', name: 'ボトムス（ズボン等）', icon: '👖' },
  { id: 'outer', name: 'アウター（上着等）', icon: '🧥' }
];

const selectedCategory = ref('tops');
const inputMode = ref('camera'); // 'camera' | 'picker'
const selectedHex = ref('#5C62D6'); // Default primary purple
const isAnalyzed = ref(false);

// Camera State
const videoRef = ref(null);
const canvasRef = ref(null);
const streamActive = ref(false);
const isCaptured = ref(false);

let stream = null;
let animationFrameId = null;

// Built-in color palettes based on season (to pull suggestions from)
const PALETTES = {
  spring: {
    tops: [
      { name: 'ピーチピンク', hex: '#FFB7B2' },
      { name: 'マリーゴールド', hex: '#FFD166' },
      { name: 'アップルグリーン', hex: '#A7C957' },
      { name: 'アプリコットオレンジ', hex: '#F3A712' },
      { name: 'アイボリーホワイト', hex: '#FFFDF6' },
      { name: 'コーラルピンク', hex: '#FF8B94' }
    ],
    bottoms: [
      { name: 'キャメルブラウン', hex: '#C68B59' },
      { name: 'ナチュラルベージュ', hex: '#E6CCB2' },
      { name: 'サファリカーキ', hex: '#A3B18A' },
      { name: 'ウォームグレー', hex: '#B5A89E' }
    ],
    outer: [
      { name: 'ハニーブラウン', hex: '#D4A373' },
      { name: 'サファリベージュ', hex: '#E5D3B3' },
      { name: 'アイボリーホワイト', hex: '#F5EBE0' },
      { name: 'テラコッタブラウン', hex: '#E76F51' }
    ]
  },
  summer: {
    tops: [
      { name: 'ラベンダーパープル', hex: '#E8DFF5' },
      { name: 'ローズピンク', hex: '#F3CFC6' },
      { name: 'スカイブルー', hex: '#B3C5FF' },
      { name: 'ミントグリーン', hex: '#C4FAF8' },
      { name: 'オフホワイト', hex: '#FAF9F6' },
      { name: 'パウダーブルー', hex: '#D0E1FD' }
    ],
    bottoms: [
      { name: 'ココアブラウン', hex: '#8E7C77' },
      { name: 'ソフトネイビー', hex: '#4A5759' },
      { name: 'ブルーグレー', hex: '#778DA9' },
      { name: 'チャコールグレー', hex: '#5C677D' }
    ],
    outer: [
      { name: 'ローズブラウン', hex: '#A38F85' },
      { name: 'ヘザーグレー', hex: '#E5E5E5' },
      { name: 'ミストブルー', hex: '#A9C0E4' },
      { name: 'ラベンダーグレー', hex: '#B8B5CC' }
    ]
  },
  autumn: {
    tops: [
      { name: 'テラコッタレッド', hex: '#D66853' },
      { name: 'マスタードイエロー', hex: '#E9C46A' },
      { name: 'オリーブグリーン', hex: '#606C38' },
      { name: 'ラストオレンジ', hex: '#B23A22' },
      { name: 'ディープティールブルー', hex: '#264653' },
      { name: 'カーキゴールド', hex: '#9B7235' }
    ],
    bottoms: [
      { name: 'ダークブラウン', hex: '#483C32' },
      { name: 'フォレストグリーン', hex: '#2C3A24' },
      { name: 'サンドベージュ', hex: '#D8C3A5' },
      { name: 'オリーブブラウン', hex: '#8B7631' }
    ],
    outer: [
      { name: 'ディープキャメル', hex: '#BC6C25' },
      { name: 'ビターチョコレート', hex: '#3E2723' },
      { name: 'モスグリーン', hex: '#4F5D2F' },
      { name: 'ラストブラウン', hex: '#8F3924' }
    ]
  },
  winter: {
    tops: [
      { name: 'ロイヤルブルー', hex: '#0F4C81' },
      { name: 'マゼンタピンク', hex: '#D81B60' },
      { name: 'ピュアホワイト', hex: '#FFFFFF' },
      { name: 'エメラルドグリーン', hex: '#007A5E' },
      { name: 'レモンイエロー', hex: '#FFF176' },
      { name: 'バイオレットパープル', hex: '#6200EA' }
    ],
    bottoms: [
      { name: 'ピュアブラック', hex: '#121212' },
      { name: 'ディープネイビー', hex: '#1A237E' },
      { name: 'スチールグレー', hex: '#757575' },
      { name: 'シルバーグレー', hex: '#B0BEC5' }
    ],
    outer: [
      { name: 'ジェットブラック', hex: '#000000' },
      { name: 'チャコールコート', hex: '#37474F' },
      { name: 'クリムゾンレッド', hex: '#B71C1C' },
      { name: 'ロイヤルパープル', hex: '#4A148C' }
    ]
  }
};

const neutralPalette = {
  white: { name: 'クリーンホワイト', hex: '#FAF9F6' },
  black: { name: 'ピュアブラック', hex: '#121212' },
  gray: { name: 'ヘザーグレー', hex: '#7F8C8D' },
  navy: { name: 'ダークネイビー', hex: '#1C2833' }
};

// Toggle input method
function setInputMode(mode) {
  inputMode.value = mode;
  if (mode === 'picker') {
    stopCamera();
    isAnalyzed.value = true;
  } else {
    isAnalyzed.value = isCaptured.value;
  }
}

// Camera control
async function startCamera() {
  try {
    isCaptured.value = false;
    isAnalyzed.value = false;
    
    stream = await navigator.mediaDevices.getUserMedia({
      video: { 
        width: { ideal: 640 }, 
        height: { ideal: 480 },
        facingMode: 'environment' // Prioritize back camera for clothes scanning
      },
      audio: false
    });
    
    if (videoRef.value) {
      videoRef.value.srcObject = stream;
      streamActive.value = true;
      requestAnimationFrame(tickLiveAnalysis);
    }
  } catch (err) {
    console.error('Camera access error:', err);
    // Fallback to front camera if environment camera fails (e.g. on laptops)
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false
      });
      if (videoRef.value) {
        videoRef.value.srcObject = stream;
        streamActive.value = true;
        requestAnimationFrame(tickLiveAnalysis);
      }
    } catch (e) {
      alert('カメラの起動に失敗しました。カラーピッカーをご利用ください。');
      inputMode.value = 'picker';
    }
  }
}

function stopCamera() {
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
  }
  if (stream) {
    stream.getTracks().forEach(track => track.stop());
  }
  streamActive.value = false;
}

function tickLiveAnalysis() {
  if (!streamActive.value || isCaptured.value) return;
  analyzeFrame(false);
  animationFrameId = requestAnimationFrame(tickLiveAnalysis);
}

function captureColor() {
  if (isCaptured.value) {
    isCaptured.value = false;
    isAnalyzed.value = false;
    if (videoRef.value && stream) {
      videoRef.value.play();
    }
    requestAnimationFrame(tickLiveAnalysis);
  } else {
    analyzeFrame(true);
    isCaptured.value = true;
    isAnalyzed.value = true;
    if (videoRef.value) {
      videoRef.value.pause();
    }
    stopCamera();
  }
}

function analyzeFrame(isFinalCapture) {
  const video = videoRef.value;
  const canvas = canvasRef.value;
  if (!video || !canvas) return;

  const width = video.videoWidth || 640;
  const height = video.videoHeight || 480;
  
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Render video frame on canvas (mirrored if front camera, but for scanning environment standard is fine)
  ctx.drawImage(video, 0, 0, width, height);

  // Define sampling window (120x120 pixels in the center)
  const size = 120;
  const sx = Math.floor((width - size) / 2);
  const sy = Math.floor((height - size) / 2);

  const imgData = ctx.getImageData(sx, sy, size, size);
  const pixels = imgData.data;

  let rSum = 0, gSum = 0, bSum = 0;
  for (let i = 0; i < pixels.length; i += 4) {
    rSum += pixels[i];
    gSum += pixels[i+1];
    bSum += pixels[i+2];
  }
  const pixelCount = pixels.length / 4;
  const avgR = Math.round(rSum / pixelCount);
  const avgG = Math.round(gSum / pixelCount);
  const avgB = Math.round(bSum / pixelCount);

  selectedHex.value = rgbToHex(avgR, avgG, avgB);

  if (!isFinalCapture) {
    // Draw visual helper circle over preview
    ctx.strokeStyle = 'var(--primary)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(width / 2, height / 2, size / 1.5, 0, 2 * Math.PI);
    ctx.stroke();
  }
}

function onHexTextInput() {
  if (/^#[0-9A-F]{6}$/i.test(selectedHex.value)) {
    isAnalyzed.value = true;
  }
}

// Compatibility analysis and suggestion logic
const compatibility = computed(() => {
  const hex = selectedHex.value;
  if (!hex || !/^#[0-9A-F]{6}$/i.test(hex)) {
    return { level: 'normal', advice: '有効な色を指定してください。' };
  }

  const { r, g, b } = hexToRgb(hex);
  const { h, s, l } = rgbToHsl(r, g, b);

  // 1. NEON / FLUORESCENT COLORS (Challenging)
  if (s > 0.93 && l > 0.20 && l < 0.80) {
    return {
      level: 'challenging',
      advice: `お選びいただいたカラー（${hex}）は彩度が極端に高い「蛍光色（ネオンカラー）」です。単体での自己主張が強すぎるため、一般的なファッションアイテム同士とコーディネートするのが非常に厳しいお色です。全身の中で広い面積を占めるトップスやボトムスとして合わせると、お洋服だけが浮いてしまったり、顔色をくすませてしまいます。このアイテムを取り入れる場合は、残りのアイテムをすべて「黒（#121212）」や「ピュアホワイト（#FFFFFF）」などのコントラストの効いた無彩色に統一し、アクセントカラー（1点主役型）として引き締めることが必須となります。`
    };
  }

  // 2. MUDDY / SHADOWED DIRTY COLORS (Challenging)
  if (s < 0.12 && l > 0.15 && l < 0.35) {
    return {
      level: 'challenging',
      advice: `お選びいただいたカラー（${hex}）は明度と彩度がともに低く、かつ濁りが強いため、コーディネート全体がくすんで見えやすいお色です。そのまま着用すると、くたびれた印象や不健康な印象を与えやすく、組み合わせの難易度が極めて高いです。どうしてもこの服を活かす場合は、他のパーツに光沢のあるクリーンな白（ピュアホワイト）などの明るい清潔感のある色をぶつけ、コントラストによって色のくすみをカバーする必要があります。`
    };
  }

  // 3. PERSONAL COLOR SEASON MISMATCHES (Careful)
  const isSpring = props.season === 'spring';
  const isSummer = props.season === 'summer';
  const isAutumn = props.season === 'autumn';
  const isWinter = props.season === 'winter';

  const isWarmSeason = isSpring || isAutumn;
  const isCoolSeason = isSummer || isWinter;

  // Let's identify the undertone of the item color
  // Warm hues: Warm orange, red, warm yellow, etc.
  const isWarmHue = (h >= 10 && h <= 80) || (h >= 345 && h <= 360);
  // Cool hues: Cyan, cool magenta, blue, cool purple
  const isCoolHue = (h >= 130 && h <= 285) || (h >= 310 && h < 345);

  const isStrongColor = s > 0.55 && l > 0.25 && l < 0.75;

  if (isWarmSeason && isCoolHue && isStrongColor) {
    // Warm season user selected a strong cool-toned item (e.g. neon cool magenta, royal blue)
    const seasonName = isSpring ? 'イエベ春' : 'イエベ秋';
    return {
      level: 'careful',
      advice: `お選びいただいたカラーは非常に強い「ブルーベース（寒色・青み）」の属性を持っています。お客様のパーソナルカラーである【${seasonName}】の温かみのある肌色とは相反する性質のため、顔のすぐ近くである「トップス」として合わせると、肌の血色が失われてくすんで見えてしまう可能性が高いです。コーディネートに組み込む際は、顔から遠ざけた「ボトムス（または靴やバッグなどの小物）」として着用し、トップスにはお客様の得意な暖かみのあるカラー（イエベ色）を配置してお顔回りの血色感を補正することをお勧めします。`
    };
  }

  if (isCoolSeason && isWarmHue && isStrongColor) {
    // Cool season user selected a strong warm-toned item (e.g. terracotta, warm orange, mustard)
    const seasonName = isSummer ? 'ブルベ夏' : 'ブルベ冬';
    return {
      level: 'careful',
      advice: `お選びいただいたカラーは非常に強い「イエローベース（暖色・黄み）」の属性を持っています。お客様のパーソナルカラーである【${seasonName}】の透明感ある涼しげな肌色とは反するため、トップスの位置に持ってくると、お顔に黄ぐすみ（肌が黄色っぽく見える）が生じやすいです。お顔に近いパーツ（トップスやアウター）にこの色を持ってくるのは避け、なるべく「ボトムス」として着用するようにし、トップスにはお客様に似合うスッキリしたホワイトや寒色系（ブルベ色）を合わせて全体の明度・清色感を保ちましょう。`
    };
  }

  // 4. GENERALLY HARMONIOUS MATCH
  let matchMsg = 'このカラーはお客様のパーソナルカラーのベースラインと良好に調和しています。';
  if (isSpring) {
    if (isWarmHue && l > 0.55) matchMsg = 'スプリング（イエベ春）のお客様にとてもよく似合う、明るく暖かみのあるイエベ系カラーです。お顔立ちを生き生きと明るく健康的に見せてくれます。';
  } else if (isSummer) {
    if (isCoolHue && s < 0.5) matchMsg = 'サマー（ブルベ夏）のお客様にピッタリな、優しく涼しげで上品なブルベ系カラーです。透明感のある上品な印象を引き立ててくれます。';
  } else if (isAutumn) {
    if (isWarmHue && l < 0.6) matchMsg = 'オータム（イエベ秋）のお客様にベストマッチする、深みと落ち着きのあるリッチなアースカラーです。シックで知的な大人っぽさを醸し出してくれます。';
  } else if (isWinter) {
    if ((isCoolHue || l < 0.25 || l > 0.8) && s > 0.5) matchMsg = 'ウィンター（ブルベ冬）のお客様に非常に似合う、濁りのない鮮やかなビビッドカラーです。都会的で洗練されたシャープな魅力を際立たせます。';
  }

  return {
    level: 'success',
    advice: matchMsg
  };
});

// Calculate outfit suggestions based on selected item and compatibility levels
const suggestedOutfit = computed(() => {
  const ownHex = selectedHex.value;
  const ownCategory = selectedCategory.value;
  
  if (!ownHex || !/^#[0-9A-F]{6}$/i.test(ownHex)) {
    return { tops: null, bottoms: null, outer: null };
  }

  const { r, g, b } = hexToRgb(ownHex);
  const { h, s, l } = rgbToHsl(r, g, b);

  const ownItem = { name: '手持ちのアイテム', hex: ownHex };
  const result = { tops: null, bottoms: null, outer: null };
  
  // Set the owned item in the appropriate slot
  result[ownCategory] = ownItem;

  const currentPalette = PALETTES[props.season] || PALETTES.spring;

  // Let's decide strategy for coordinating the remaining slots:
  if (isChallengingColor(s, l)) {
    // Strategy: Neutralize other slots with contrast colors to save the outfit
    if (ownCategory === 'tops') {
      result.bottoms = l > 0.5 ? { ...neutralPalette.black } : { ...neutralPalette.white };
      result.outer = { ...neutralPalette.gray };
    } else if (ownCategory === 'bottoms') {
      result.tops = l > 0.5 ? { ...neutralPalette.navy } : { ...neutralPalette.white };
      result.outer = { ...neutralPalette.gray };
    } else { // outer
      result.tops = { ...neutralPalette.white };
      result.bottoms = l > 0.5 ? { ...neutralPalette.black } : { ...neutralPalette.navy };
    }
  } else {
    // Strategy: Coordinate nicely using the user's season palette
    if (ownCategory === 'tops') {
      result.bottoms = selectBestComplementary(ownHex, currentPalette.bottoms);
      result.outer = selectBestComplementary(ownHex, currentPalette.outer);
    } else if (ownCategory === 'bottoms') {
      result.tops = selectBestComplementary(ownHex, currentPalette.tops);
      result.outer = selectBestComplementary(ownHex, currentPalette.outer);
    } else {
      result.tops = selectBestComplementary(ownHex, currentPalette.tops);
      result.bottoms = selectBestComplementary(ownHex, currentPalette.bottoms);
    }
  }

  return result;
});

function isChallengingColor(s, l) {
  return (s > 0.93 && l > 0.20 && l < 0.80) || (s < 0.12 && l > 0.15 && l < 0.35);
}

// Select the best complementary item from a palette list
function selectBestComplementary(baseHex, candidates) {
  if (!candidates || candidates.length === 0) return { name: 'ホワイト', hex: '#FAF9F6' };
  
  const { r: br, g: bg, b: bb } = hexToRgb(baseHex);
  const { h: bh, s: bs, l: bl } = rgbToHsl(br, bg, bb);
  
  let bestItem = candidates[0];
  let bestScore = -1;

  for (const item of candidates) {
    const { r, g, b } = hexToRgb(item.hex);
    const { h, s, l } = rgbToHsl(r, g, b);

    let score = 0;
    
    const lDiff = Math.abs(bl - l);
    score += lDiff * 50; 
    
    if (bs > 0.55) {
      score += (1 - s) * 30;
    } else {
      score += s * 20;
    }

    const hDiff = Math.min(Math.abs(bh - h), 360 - Math.abs(bh - h));
    if (hDiff > 120 && hDiff < 240) {
      score += 15;
    } else if (hDiff < 40) {
      score += 10;
    }

    if (score > bestScore) {
      bestScore = score;
      bestItem = item;
    }
  }

  return { ...bestItem };
}

function getPartDisplayName(partId) {
  const parts = { tops: 'トップス', bottoms: 'ボトムス', outer: 'アウター' };
  return parts[partId] || '';
}

function applyOutfitToApp() {
  emit('itemRegistered', {
    category: selectedCategory.value,
    hex: selectedHex.value,
    suggestedOutfit: suggestedOutfit.value,
    compatibility: compatibility.value
  });
  
  emit('requestNextStep');
}

// Helper color converters
function rgbToHex(r, g, b) {
  return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase();
}

function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 0, g: 0, b: 0 };
}

function rgbToHsl(r, g, b) {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;

  if (max === min) {
    h = s = 0;
  } else {
    const d = max - min;
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

onBeforeUnmount(() => {
  stopCamera();
});
</script>

<style scoped>
.own-item-scanner-card {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  width: 100%;
}

.scanner-instruction {
  font-size: 0.85rem;
  color: var(--text-muted);
  line-height: 1.5;
}

.config-section {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.section-label {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text-muted);
}

.category-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.5rem;
}

.category-btn {
  background: rgba(0, 0, 0, 0.02);
  border: 1px solid rgba(0, 0, 0, 0.06);
  border-radius: 10px;
  padding: 0.75rem 0.5rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.category-btn:hover {
  background: rgba(0, 0, 0, 0.04);
}

.category-btn.active {
  background: linear-gradient(135deg, rgba(92, 98, 214, 0.08) 0%, rgba(217, 119, 6, 0.04) 100%);
  border-color: var(--primary);
  box-shadow: 0 4px 12px rgba(92,98,214,0.08);
}

.category-btn .icon {
  font-size: 1.35rem;
}

.category-btn .label {
  font-size: 0.72rem;
  font-weight: bold;
  color: var(--text-color);
}

.toggle-buttons {
  display: flex;
  gap: 0.25rem;
  background: rgba(0, 0, 0, 0.05);
  padding: 3px;
  border-radius: 8px;
}

.toggle-btn {
  flex: 1;
  background: transparent;
  border: none;
  color: var(--text-muted);
  font-size: 0.8rem;
  padding: 0.5rem;
  border-radius: 6px;
  cursor: pointer;
  font-weight: bold;
  transition: all 0.2s ease;
}

.toggle-btn.active {
  background: var(--primary);
  color: #fff;
  box-shadow: 0 2px 6px rgba(92,98,214,0.15);
}

/* Camera design elements */
.camera-module {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.camera-wrapper {
  position: relative;
  width: 100%;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid var(--glass-border);
  background: #eae8e3;
  aspect-ratio: 4/3;
  box-shadow: inset 0 2px 8px rgba(0,0,0,0.08);
}

.video-container {
  width: 100%;
  height: 100%;
}

.webcam-feed, .snapshot-canvas {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.item-guide {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  background: radial-gradient(circle, transparent 25%, rgba(0, 0, 0, 0.2) 80%);
}

.guide-circle {
  width: 140px;
  height: 140px;
  border: 3.5px dashed var(--primary);
  border-radius: 50%;
  box-shadow: 0 0 15px rgba(255, 255, 255, 0.2);
  animation: scanPulse 2s infinite ease-in-out;
}

@keyframes scanPulse {
  0% { transform: scale(1); opacity: 0.8; }
  50% { transform: scale(1.05); opacity: 1; }
  100% { transform: scale(1); opacity: 0.8; }
}

.guide-text {
  margin-top: 1rem;
  font-size: 0.78rem;
  color: #fff;
  text-shadow: 0 1px 3px rgba(0,0,0,0.6);
  font-weight: bold;
  background: rgba(0, 0, 0, 0.6);
  padding: 0.35rem 0.75rem;
  border-radius: 50px;
}

.status-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: linear-gradient(transparent, rgba(0,0,0,0.7));
  padding: 1.5rem 1rem 1rem;
}

.swatch-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.swatch-info .label {
  font-size: 0.72rem;
  color: rgba(255, 255, 255, 0.8);
}

.color-indicator-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.color-circle {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: 2px solid #fff;
  box-shadow: 0 2px 8px rgba(0,0,0,0.3);
  transition: background-color 0.2s ease;
}

.hex-text {
  font-family: var(--font-mono);
  font-size: 0.95rem;
  color: #fff;
  font-weight: bold;
}

.controls-row {
  display: flex;
  gap: 0.75rem;
}

.btn {
  flex: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  border-radius: 10px;
  border: none;
  font-weight: 600;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.btn-primary {
  background: var(--primary);
  color: white;
}
.btn-primary:hover {
  background: var(--primary-hover);
  transform: translateY(-1px);
}

.btn-accent {
  background: var(--accent);
  color: white;
  box-shadow: 0 4px 12px rgba(217, 119, 6, 0.25);
}
.btn-accent:hover {
  background: var(--accent-hover);
  transform: translateY(-1px);
}

.btn-secondary {
  background: rgba(0, 0, 0, 0.03);
  color: var(--text-color);
  border: 1px solid rgba(0, 0, 0, 0.08);
}
.btn-secondary:hover {
  background: rgba(0, 0, 0, 0.06);
}

/* Color picker view styles */
.picker-module {
  animation: fadeIn 0.3s ease-out;
}

.picker-container {
  padding: 1.25rem;
  border-color: rgba(0,0,0,0.05);
}

.picker-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1.5rem;
  flex-wrap: wrap;
}

.color-picker-label {
  display: flex;
  align-items: center;
  gap: 1rem;
  cursor: pointer;
  flex-grow: 1;
}

.native-color-picker {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  border: 0;
}

.picker-swatch {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  border: 2px solid #fff;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  display: block;
  flex-shrink: 0;
  transition: transform 0.2s ease;
}

.color-picker-label:hover .picker-swatch {
  transform: scale(1.05);
}

.picker-instructions {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--primary);
}

.hex-display-box {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.hex-display-box .label {
  font-size: 0.72rem;
  color: var(--text-muted);
  font-weight: 500;
}

.hex-input-text {
  font-family: var(--font-mono);
  font-size: 1rem;
  font-weight: bold;
  padding: 0.5rem;
  border: 1px solid rgba(0,0,0,0.1);
  border-radius: 6px;
  width: 110px;
  text-align: center;
  outline: none;
  background: rgba(0, 0, 0, 0.01);
  transition: all 0.2s ease;
}

.hex-input-text:focus {
  border-color: var(--primary);
  background: #fff;
}

/* Analysis Section styling */
.analysis-section {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  animation: fadeIn 0.4s ease-out;
  border-top: 1px solid rgba(0, 0, 0, 0.06);
  padding-top: 1.25rem;
}

.section-title {
  font-size: 0.95rem;
  font-weight: bold;
  color: var(--text-color);
}

.compatibility-alert {
  display: flex;
  gap: 1rem;
  padding: 1.25rem;
  border-radius: 16px;
  line-height: 1.5;
  border-width: 1px;
  border-style: solid;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.02);
}

.compatibility-alert.challenging {
  background-color: #fff5f5;
  border-color: #feb2b2;
  border-left: 6px solid #e53e3e;
}
.compatibility-alert.challenging h4 {
  color: #c53030;
  font-size: 0.9rem;
  font-weight: 800;
  margin-bottom: 0.25rem;
}
.compatibility-alert.challenging .alert-text {
  color: #9b2c2c;
  font-size: 0.8rem;
}

.compatibility-alert.careful {
  background-color: #fffaf0;
  border-color: #fbd38d;
  border-left: 6px solid #dd6b20;
}
.compatibility-alert.careful h4 {
  color: #c05621;
  font-size: 0.9rem;
  font-weight: 800;
  margin-bottom: 0.25rem;
}
.compatibility-alert.careful .alert-text {
  color: #9c4221;
  font-size: 0.8rem;
}

.compatibility-alert.success {
  background-color: #f0fdf4;
  border-color: #bbf7d0;
  border-left: 6px solid #16a34a;
}
.compatibility-alert.success h4 {
  color: #15803d;
  font-size: 0.9rem;
  font-weight: 800;
  margin-bottom: 0.25rem;
}
.compatibility-alert.success .alert-text {
  color: #166534;
  font-size: 0.8rem;
}

.alert-icon {
  font-size: 1.35rem;
  line-height: 1;
}

.alert-body {
  display: flex;
  flex-direction: column;
}

/* Suggested outfit layouts */
.suggestion-preview-area {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.suggestion-preview-area h4 {
  font-size: 0.88rem;
  color: var(--text-color);
  font-weight: 700;
}

.sub-desc {
  font-size: 0.78rem;
  color: var(--text-muted);
}

.suggested-layout {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.75rem;
  margin-top: 0.5rem;
}

.suggested-card {
  background: rgba(0,0,0,0.015);
  border: 1px solid rgba(0,0,0,0.05);
  border-radius: 12px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  transition: all 0.2s ease;
}

.suggested-card.is-owned {
  border-color: var(--primary);
  box-shadow: 0 4px 10px rgba(92,98,214,0.05);
  background: rgba(92, 98, 214, 0.01);
}

.card-swatch {
  height: 50px;
  width: 100%;
  position: relative;
  border-bottom: 1px solid rgba(0,0,0,0.04);
}

.owned-tag {
  position: absolute;
  bottom: 4px;
  right: 4px;
  background: var(--primary);
  color: white;
  font-size: 0.55rem;
  font-weight: bold;
  padding: 0.1rem 0.35rem;
  border-radius: 50px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

.card-info {
  padding: 0.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.part-name {
  font-size: 0.65rem;
  color: var(--text-muted);
  font-weight: bold;
}

.color-name {
  font-size: 0.75rem;
  font-weight: 800;
  color: var(--text-color);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.color-hex {
  font-family: var(--font-mono);
  font-size: 0.68rem;
  color: var(--text-muted);
}

.actions-row {
  margin-top: 0.5rem;
  display: flex;
}

.apply-btn {
  width: 100%;
  box-shadow: 0 4px 12px rgba(92,98,214,0.2);
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
