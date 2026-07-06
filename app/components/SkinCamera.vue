<template>
  <div class="skin-camera-card">
    
    <!-- White Balance Calibration Explanation (Always visible when active to guide the user) -->
    <div v-if="streamActive && !isCaptured" class="wb-explanation-card">
      <div class="bulb-icon">💡</div>
      <div class="wb-explanation-body">
        <h4>より正確に測定するための準備</h4>
        <p>
          お部屋の照明の色（温かみのあるオレンジ灯や、青白い蛍光灯など）による写りの変化を防ぐため、**最初に白い紙をカメラに写してホワイトバランスを調整**します。これにより、肌本来の色合いをより正確に測定することができます。
        </p>
      </div>
    </div>

    <!-- Calibration Info Banner (Highly prominent step badges) -->
    <div v-if="streamActive && !isCaptured" class="calibration-banner" :class="{ calibrated: isWbCalibrated }">
      <div class="banner-icon">
        <svg v-if="isWbCalibrated" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14M22 4L12 14.01l-3-3"/></svg>
        <svg v-else xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
      </div>
      <div class="banner-body">
        <span class="banner-title">{{ isWbCalibrated ? 'ステップ 2/2：肌色の分析' : 'ステップ 1/2：ホワイトバランス（白紙）調整' }}</span>
        <span class="banner-text">
          {{ isWbCalibrated ? '調整が完了しました。次に、顔を枠内に映してください。' : '白い紙（コピー用紙やティッシュ等）をカメラの円内に大きく映してください。' }}
        </span>
      </div>
      <button v-if="isWbCalibrated" @click="resetCalibration" class="btn-text-only">再調整する</button>
    </div>

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

        <!-- Centered Target Guide -->
        <div v-if="!isCaptured && streamActive" class="face-guide">
          <div class="guide-circle" :class="{ 'calibration-mode': !isWbCalibrated }" :style="{ width: (scanSize * 1.3) + 'px', height: (scanSize * 1.3) + 'px' }"></div>
          <p class="guide-text">
            {{ isWbCalibrated ? '顔を円の中に映してください' : '白い紙を円の中に映してください' }}
          </p>
        </div>
      </div>
      
      <!-- Live color swatch indicators -->
      <div class="status-overlay" v-if="streamActive || isCaptured">
        <div class="swatch-info">
          <span class="label">検出した色:</span>
          <div class="color-indicator-row">
            <div class="color-circle" :style="{ backgroundColor: sampledHex }"></div>
            <span class="hex-text">{{ sampledHex }}</span>
          </div>
        </div>
        
        <!-- Season badge shown only when analyzing skin tone -->
        <div v-if="detectedSeason && isWbCalibrated" class="season-badge" :class="detectedSeason.id">
          {{ detectedSeason.name }}
        </div>
      </div>
    </div>

    <!-- Size controller -->
    <div v-if="streamActive && !isCaptured" class="size-controller glass-panel">
      <div class="slider-header">
        <span class="slider-label">🎯 スキャン範囲（円）の大きさ:</span>
        <span class="slider-value">{{ scanSize }}px</span>
      </div>
      <div class="slider-container">
        <span class="slider-icon">🔎</span>
        <input 
          type="range" 
          v-model.number="scanSize" 
          min="40" 
          max="240" 
          step="10" 
          class="size-slider"
        />
        <span class="slider-icon">🔍</span>
      </div>
    </div>

    <div class="controls-row">
      <button 
        v-if="!streamActive && !isCaptured" 
        @click="startCamera" 
        class="btn btn-primary"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 7l-7 5 7 5V7z"></path><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>
        カメラを起動する
      </button>

      <template v-else>
        <!-- WB Calibration Button (Step 1) -->
        <button 
          v-if="!isWbCalibrated && streamActive"
          @click="calibrateWhiteBalance" 
          class="btn btn-accent pulse-btn" 
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
          ホワイトバランスを調整する
        </button>

        <!-- Skin Tone Capture Button (Step 2) -->
        <button 
          v-else-if="isWbCalibrated"
          @click="captureAndAnalyze" 
          class="btn btn-accent" 
          :disabled="!streamActive && !isCaptured"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="3"></circle></svg>
          {{ isCaptured ? '写真を撮り直す' : '肌色を分析する' }}
        </button>
        
        <button 
          v-if="streamActive || isCaptured"
          @click="stopCamera" 
          class="btn btn-secondary"
        >
          カメラを停止
        </button>
      </template>
    </div>

    <!-- Details on Personal Color -->
    <div class="analysis-results-panel" v-if="detectedSeason && isWbCalibrated">
      <div class="results-header">
        <h3>分析結果の詳細</h3>
        <span class="wb-factor-tag">補正完了 (R:{{ wbGains.r.toFixed(2) }} G:{{ wbGains.g.toFixed(2) }} B:{{ wbGains.b.toFixed(2) }})</span>
      </div>
      <div class="details-grid">
        <div class="detail-item">
          <span class="lbl">カラーグループ</span>
          <span class="val">{{ detectedSeason.tone }}</span>
        </div>
        <div class="detail-item">
          <span class="lbl">サブタイプ</span>
          <span class="val">{{ detectedSeason.subType }}</span>
        </div>
        <div class="detail-item">
          <span class="lbl">明るさ (明度)</span>
          <span class="val">{{ Math.round(sampledHSL.l * 100) }}%</span>
        </div>
        <div class="detail-item">
          <span class="lbl">鮮やかさ (彩度)</span>
          <span class="val">{{ Math.round(sampledHSL.s * 100) }}%</span>
        </div>
      </div>
      <p class="season-desc">{{ detectedSeason.description }}</p>
    </div>
  </div>
</template>

<script setup>
import { ref, onBeforeUnmount } from 'vue';

const emit = defineEmits(['analyzed']);

const videoRef = ref(null);
const canvasRef = ref(null);
const streamActive = ref(false);
const isCaptured = ref(false);
const scanSize = ref(100); // Dynamic sampling area size (40px - 240px)

const sampledHex = ref('#D9B48F'); // Default beige
const sampledHSL = ref({ h: 30, s: 0.45, l: 0.70 });
const detectedSeason = ref(null);

// White Balance Calibration State
const isWbCalibrated = ref(false);
const wbGains = ref({ r: 1.0, g: 1.0, b: 1.0 });

let stream = null;
let animationFrameId = null;

const SEASONS = {
  SPRING: {
    id: 'spring',
    name: 'スプリング (イエベ春)',
    tone: 'Warm Tone (イエローベース)',
    subType: '明るく活発・健康的な印象',
    description: '明るく華やかな黄みのあるカラーが似合うタイプ。フレッシュ、キュート、アクティブな印象を与え、春の陽気のようなイキイキとした魅力が引き立ちます。',
  },
  SUMMER: {
    id: 'summer',
    name: 'サマー (ブルベ夏)',
    tone: 'Cool Tone (ブルーベース)',
    subType: '爽やかで上品・知性的な印象',
    description: '爽やかで上品な青みのあるスモーキーカラーが似合うタイプ。エレガント、知性的、涼しげな印象を与え、アジサイのような優しく柔らかな魅力が引き立ちます。',
  },
  AUTUMN: {
    id: 'autumn',
    name: 'オータム (イエベ秋)',
    tone: 'Warm Tone (イエローベース)',
    subType: 'シックで大人・知性的な印象',
    description: '深みと温かみのあるアースカラーや大人っぽいシックな色が似合うタイプ。ゴージャス、ナチュラルな印象を与え、豊かな実りの秋のような深みのある魅力が引き立ちます。',
  },
  WINTER: {
    id: 'winter',
    name: 'ウィンター (ブルベ冬)',
    tone: 'Cool Tone (ブルーベース)',
    subType: 'シャープで洗練・個性的な印象',
    description: 'コントラストの強い、鮮やかでクールな原色やモノトーンが似合うタイプ。シャープ、モダン、凛とした印象を与え、都会的で洗練された唯一無二の華やかな存在感が引き立ちます。',
  }
};

async function startCamera() {
  try {
    isCaptured.value = false;
    detectedSeason.value = null;
    isWbCalibrated.value = false;
    wbGains.value = { r: 1.0, g: 1.0, b: 1.0 };
    
    stream = await navigator.mediaDevices.getUserMedia({
      video: { 
        width: { ideal: 640 }, 
        height: { ideal: 480 },
        facingMode: 'user'
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
    alert('カメラへのアクセスが拒否されました。設定を確認してください。');
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
  isCaptured.value = false;
}

function tickLiveAnalysis() {
  if (!streamActive.value || isCaptured.value) return;
  
  analyzeFrame(false);
  animationFrameId = requestAnimationFrame(tickLiveAnalysis);
}

function calibrateWhiteBalance() {
  const video = videoRef.value;
  if (!video) return;

  const width = video.videoWidth || 640;
  const height = video.videoHeight || 480;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.translate(width, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(video, 0, 0, width, height);
  ctx.setTransform(1, 0, 0, 1, 0, 0);

  const size = scanSize.value; // Using dynamic scan size
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
  const avgR = rSum / pixelCount;
  const avgG = gSum / pixelCount;
  const avgB = bSum / pixelCount;

  const avgLum = (avgR + avgG + avgB) / 3;

  const gainR = avgR > 0 ? avgLum / avgR : 1.0;
  const gainG = avgG > 0 ? avgLum / avgG : 1.0;
  const gainB = avgB > 0 ? avgLum / avgB : 1.0;

  wbGains.value = { r: gainR, g: gainG, b: gainB };
  isWbCalibrated.value = true;
}

function resetCalibration() {
  isWbCalibrated.value = false;
  wbGains.value = { r: 1.0, g: 1.0, b: 1.0 };
}

function captureAndAnalyze() {
  if (isCaptured.value) {
    isCaptured.value = false;
    if (videoRef.value && stream) {
      videoRef.value.play();
    }
    requestAnimationFrame(tickLiveAnalysis);
  } else {
    analyzeFrame(true);
    isCaptured.value = true;
    if (videoRef.value) {
      videoRef.value.pause();
    }
    emit('analyzed', {
      season: detectedSeason.value.id,
      hex: sampledHex.value,
      hsl: sampledHSL.value,
      wbGains: wbGains.value
    });
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

  ctx.translate(width, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(video, 0, 0, width, height);
  ctx.setTransform(1, 0, 0, 1, 0, 0);

  const size = scanSize.value; // Using dynamic scan size
  const sx = Math.floor((width - size) / 2);
  const sy = Math.floor((height - size) / 2);

  const imgData = ctx.getImageData(sx, sy, size, size);
  const pixels = imgData.data;

  let rSum = 0, gSum = 0, bSum = 0, count = 0;
  let hSum = 0, sSum = 0, lSum = 0;

  for (let i = 0; i < pixels.length; i += 4) {
    let r = pixels[i];
    let g = pixels[i+1];
    let b = pixels[i+2];

    if (isWbCalibrated.value) {
      r = Math.min(255, Math.max(0, r * wbGains.value.r));
      g = Math.min(255, Math.max(0, g * wbGains.value.g));
      b = Math.min(255, Math.max(0, b * wbGains.value.b));
    }

    const hsl = rgbToHsl(r, g, b);

    const isSkinHue = (hsl.h <= 48 || hsl.h >= 335);
    const isSkinSat = (hsl.s >= 0.15 && hsl.s <= 0.70);
    const isSkinLight = (hsl.l >= 0.15 && hsl.l <= 0.85);

    if (isSkinHue && isSkinSat && isSkinLight) {
      rSum += r;
      gSum += g;
      bSum += b;
      hSum += hsl.h;
      sSum += hsl.s;
      lSum += hsl.l;
      count++;
    }
  }

  if (count < (size * size * 0.05)) {
    rSum = 0; gSum = 0; bSum = 0;
    hSum = 0; sSum = 0; lSum = 0;
    for (let i = 0; i < pixels.length; i += 4) {
      let r = pixels[i];
      let g = pixels[i+1];
      let b = pixels[i+2];

      if (isWbCalibrated.value) {
        r = Math.min(255, Math.max(0, r * wbGains.value.r));
        g = Math.min(255, Math.max(0, g * wbGains.value.g));
        b = Math.min(255, Math.max(0, b * wbGains.value.b));
      }

      rSum += r;
      gSum += g;
      bSum += b;
      const hsl = rgbToHsl(r, g, b);
      hSum += hsl.h;
      sSum += hsl.s;
      lSum += hsl.l;
    }
    count = pixels.length / 4;
  }

  const avgR = Math.round(rSum / count);
  const avgG = Math.round(gSum / count);
  const avgB = Math.round(bSum / count);
  
  const avgH = Math.round(hSum / count);
  const avgS = sSum / count;
  const avgL = lSum / count;

  sampledHex.value = rgbToHex(avgR, avgG, avgB);
  sampledHSL.value = { h: avgH, s: avgS, l: avgL };

  detectedSeason.value = classifyPersonalColor(avgH, avgS, avgL);

  if (!isFinalCapture) {
    ctx.strokeStyle = isWbCalibrated.value ? 'rgba(255, 255, 255, 0.4)' : 'rgba(217, 119, 6, 0.7)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(width / 2, height / 2, size / 1.5, 0, 2 * Math.PI);
    ctx.stroke();
  }
}

function classifyPersonalColor(h, s, l) {
  const isWarm = (h >= 16 && h <= 36);
  if (isWarm) {
    if (s > 0.45 || l > 0.65) {
      return SEASONS.SPRING;
    } else {
      return SEASONS.AUTUMN;
    }
  } else {
    if (l > 0.58 && s < 0.42) {
      return SEASONS.SUMMER;
    } else {
      return SEASONS.WINTER;
    }
  }
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

function rgbToHex(r, g, b) {
  return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase();
}

onBeforeUnmount(() => {
  stopCamera();
});
</script>

<style scoped>
.skin-camera-card {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  width: 100%;
}

/* White Balance Explanation Card */
.wb-explanation-card {
  display: flex;
  gap: 0.85rem;
  background: #fdfaf2;
  border: 1px solid #f3e8d2;
  border-radius: 12px;
  padding: 1rem;
}

.bulb-icon {
  font-size: 1.25rem;
  line-height: 1;
}

.wb-explanation-body h4 {
  font-size: 0.85rem;
  font-weight: bold;
  color: #854d0e;
  margin-bottom: 0.25rem;
}

.wb-explanation-body p {
  font-size: 0.78rem;
  line-height: 1.5;
  color: #713f12;
}

.calibration-banner {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  background: #fffbeb; 
  border: 1px solid #fde68a;
  border-left: 4px solid var(--accent);
  padding: 0.85rem 1rem;
  border-radius: 10px;
  animation: slideIn 0.3s ease-out;
}

.calibration-banner.calibrated {
  background: #f0fdf4;
  border-color: #bbf7d0;
  border-left-color: #10b981;
}

.banner-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--accent);
}

.calibration-banner.calibrated .banner-icon {
  color: #10b981;
}

.banner-body {
  display: flex;
  flex-direction: column;
  flex-grow: 1;
  gap: 0.15rem;
}

.banner-title {
  font-size: 0.82rem;
  font-weight: 800;
  color: var(--text-color);
}

.banner-text {
  font-size: 0.75rem;
  color: var(--text-muted);
  line-height: 1.45;
}

.btn-text-only {
  background: transparent;
  border: none;
  color: #dc2626;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
}

.btn-text-only:hover {
  background: rgba(220, 38, 38, 0.05);
}

.camera-wrapper {
  position: relative;
  width: 100%;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid var(--glass-border);
  background: #eae8e3;
  aspect-ratio: 4/3;
}

.video-container {
  position: relative;
  width: 100%;
  height: 100%;
}

.webcam-feed, .snapshot-canvas {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.face-guide {
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
  background: radial-gradient(circle, transparent 25%, rgba(0, 0, 0, 0.18) 80%);
}

.guide-circle {
  width: 130px;
  height: 130px;
  border: 3.5px dashed rgba(255, 255, 255, 0.9);
  border-radius: 50%;
  box-shadow: 0 0 15px rgba(255, 255, 255, 0.2);
  animation: pulse 2s infinite ease-in-out;
}

.guide-circle.calibration-mode {
  border-color: var(--accent);
  border-style: dotted;
  box-shadow: 0 0 20px rgba(217, 119, 6, 0.35);
}

@keyframes pulse {
  0% { transform: scale(1); opacity: 0.8; }
  50% { transform: scale(1.04); opacity: 1; }
  100% { transform: scale(1); opacity: 0.8; }
}

.guide-text {
  margin-top: 1rem;
  font-size: 0.82rem;
  color: #fff;
  text-shadow: 0 1px 3px rgba(0,0,0,0.6);
  font-weight: bold;
  letter-spacing: 0.05em;
  background: rgba(0, 0, 0, 0.55);
  padding: 0.35rem 0.85rem;
  border-radius: 50px;
}

.status-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: linear-gradient(transparent, rgba(0,0,0,0.7));
  padding: 1.5rem 1rem 1rem;
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  pointer-events: none;
}

.swatch-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.swatch-info .label {
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.8);
}

.color-indicator-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.color-circle {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: 2px solid #fff;
  box-shadow: 0 2px 8px rgba(0,0,0,0.2);
}

.hex-text {
  font-family: var(--font-mono);
  font-size: 0.9rem;
  color: #fff;
  font-weight: bold;
}

.season-badge {
  padding: 0.35rem 0.85rem;
  border-radius: 50px;
  font-size: 0.8rem;
  font-weight: bold;
  color: #fff;
  box-shadow: 0 4px 10px rgba(0,0,0,0.25);
}

.season-badge.spring { background: linear-gradient(135deg, #ff7e5f, #feb47b); }
.season-badge.summer { background: linear-gradient(135deg, #a1c4fd, #c2e9fb); color: #333; }
.season-badge.autumn { background: linear-gradient(135deg, #d35400, #f39c12); }
.season-badge.winter { background: linear-gradient(135deg, #7b1fa2, #e91e63); }

.controls-row {
  display: flex;
  gap: 0.75rem;
  width: 100%;
}

.btn {
  flex: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  border-radius: 8px;
  border: none;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
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
}
.btn-accent:hover {
  background: var(--accent-hover);
  transform: translateY(-1px);
}

/* Pulsing effect to make the calibration button highly clickable */
.pulse-btn {
  box-shadow: 0 0 0 0 rgba(217, 119, 6, 0.4);
  animation: buttonPulse 2s infinite;
}

@keyframes buttonPulse {
  0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(217, 119, 6, 0.4); }
  50% { transform: scale(1.02); box-shadow: 0 0 0 8px rgba(217, 119, 6, 0); }
  100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(217, 119, 6, 0); }
}

.btn-secondary {
  background: rgba(0, 0, 0, 0.03);
  color: var(--text-color);
  border: 1px solid rgba(0, 0, 0, 0.08);
}
.btn-secondary:hover {
  background: rgba(0, 0, 0, 0.06);
}

.analysis-results-panel {
  margin-top: 0.5rem;
  padding-top: 1.25rem;
  border-top: 1px solid rgba(0, 0, 0, 0.05);
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  animation: fadeIn 0.4s ease-out;
}

.results-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.analysis-results-panel h3 {
  font-size: 0.95rem;
  font-weight: bold;
  color: var(--text-color);
}

.wb-factor-tag {
  font-family: var(--font-mono);
  font-size: 0.65rem;
  color: var(--text-muted);
  background: rgba(0, 0, 0, 0.03);
  padding: 0.2rem 0.4rem;
  border-radius: 4px;
}

.details-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.75rem;
}

.detail-item {
  background: rgba(0, 0, 0, 0.015);
  border: 1px solid rgba(0, 0, 0, 0.04);
  border-radius: 8px;
  padding: 0.5rem 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.detail-item .lbl {
  font-size: 0.7rem;
  color: var(--text-muted);
  text-transform: uppercase;
}

.detail-item .val {
  font-weight: bold;
  font-size: 0.9rem;
  color: var(--text-color);
}

.season-desc {
  font-size: 0.85rem;
  line-height: 1.5;
  color: var(--text-muted);
  background: rgba(0, 0, 0, 0.015);
  padding: 0.75rem;
  border-radius: 8px;
  border-left: 3px solid var(--accent);
}

@keyframes slideIn {
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Size controller styles */
.size-controller {
  margin-top: 0.75rem;
  padding: 0.75rem 1rem;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.45);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.3);
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.slider-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.75rem;
  font-weight: bold;
  color: var(--text-color);
}

.slider-value {
  color: var(--primary);
  font-family: var(--font-mono);
  background: rgba(92, 98, 214, 0.08);
  padding: 0.1rem 0.4rem;
  border-radius: 4px;
}

.slider-container {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.slider-icon {
  font-size: 0.85rem;
  opacity: 0.7;
  user-select: none;
}

.size-slider {
  flex: 1;
  -webkit-appearance: none;
  appearance: none;
  height: 6px;
  border-radius: 3px;
  background: rgba(0, 0, 0, 0.08);
  outline: none;
  cursor: pointer;
  transition: background 0.2s ease;
}

.size-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--primary);
  border: 2px solid #fff;
  box-shadow: 0 2px 6px rgba(0,0,0,0.15);
  transition: transform 0.1s ease;
}

.size-slider::-webkit-slider-thumb:hover {
  transform: scale(1.15);
}

.size-slider::-moz-range-thumb {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--primary);
  border: 2px solid #fff;
  box-shadow: 0 2px 6px rgba(0,0,0,0.15);
  transition: transform 0.1s ease;
  cursor: pointer;
}

.size-slider::-moz-range-thumb:hover {
  transform: scale(1.15);
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
