<template>
  <div class="app-container">
    <!-- Header -->
    <header class="app-header glass-panel">
      <div class="logo-area">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="logo-icon">
          <path fill-rule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm14.024-.983a1.125 1.125 0 010 1.966l-5.603 3.113A1.125 1.125 0 019 15.113V8.887c0-.857.921-1.4 1.671-.983l5.603 3.113z" clip-rule="evenodd" />
        </svg>
        <h1>PaletteMatch <span class="gradient-text">AI</span></h1>
      </div>
      <p class="tagline">肌色診断＆服のカラーコーディネート提案</p>
    </header>

    <!-- Privacy Assurance Banner -->
    <div class="privacy-banner glass-panel">
      <div class="privacy-icon">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
      </div>
      <div class="privacy-text">
        <strong>🛡️ 安心のプライバシー保護保証</strong><br />
        カメラの映像、診断結果、AIとのチャット内容はすべて**お客様のデバイス（ブラウザ）内でのみローカルに処理**されます。映像や音声が外部サーバーに送信・収集・保存されることは一切ありません。
      </div>
    </div>

    <!-- 1-Pane Step-by-Step Accordion Workspace -->
    <main class="wizard-pane">
      
      <!-- STEP 1: Skin Diagnostics -->
      <div class="step-card glass-panel" :class="{ 'is-active': activeStep === 1 }">
        <div class="step-header" @click="setActiveStep(1)">
          <div class="step-title-row">
            <span class="step-num">1</span>
            <h2>肌色の診断・パーソナルカラー分析</h2>
          </div>
          <!-- Status Badge -->
          <div class="step-status">
            <span v-if="selectedSeason" class="season-badge-sm" :class="selectedSeason">
              {{ getSeasonDisplayName(selectedSeason) }}
            </span>
            <span v-else class="status-pending">診断前</span>
            <span class="chevron-icon" :class="{ rotated: activeStep === 1 }">▼</span>
          </div>
        </div>
        
        <div class="step-body" v-show="activeStep === 1">
          <!-- Webcam component -->
          <SkinCamera @analyzed="onSkinAnalyzed" />

          <!-- Manual selection override -->
          <div class="manual-picker-section">
            <h3>手動診断（カメラなしで試す）</h3>
            <p class="picker-desc">カメラが使えない場合や、他のカラータイプを試したい場合は以下から選択してください：</p>
            <div class="picker-grid">
              <button 
                @click="selectSeasonManually('spring')" 
                class="picker-btn spring" 
                :class="{ selected: selectedSeason === 'spring' }"
              >
                イエベ春 (Spring)
              </button>
              <button 
                @click="selectSeasonManually('summer')" 
                class="picker-btn summer" 
                :class="{ selected: selectedSeason === 'summer' }"
              >
                ブルベ夏 (Summer)
              </button>
              <button 
                @click="selectSeasonManually('autumn')" 
                class="picker-btn autumn" 
                :class="{ selected: selectedSeason === 'autumn' }"
              >
                イエベ秋 (Autumn)
              </button>
              <button 
                @click="selectSeasonManually('winter')" 
                class="picker-btn winter" 
                :class="{ selected: selectedSeason === 'winter' }"
              >
                ブルベ冬 (Winter)
              </button>
            </div>
          </div>

          <!-- Navigation buttons -->
          <div class="step-navigation" v-if="selectedSeason">
            <button @click="setActiveStep(2)" class="btn btn-primary next-step-btn">
              手持ちアイテムの登録へ進む
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
            </button>
          </div>
        </div>
      </div>

      <!-- STEP 2: Own Item Registration -->
      <div class="step-card glass-panel" :class="{ 'is-active': activeStep === 2, 'disabled': !selectedSeason }">
        <div class="step-header" @click="selectedSeason && setActiveStep(2)">
          <div class="step-title-row">
            <span class="step-num">2</span>
            <h2>手持ちアイテムのカラー判定・登録</h2>
          </div>
          <!-- Status Badge -->
          <div class="step-status">
            <span v-if="registeredOwnItem" class="owned-status-badge">
              {{ getCategoryDisplayName(registeredOwnItem.category) }}: {{ registeredOwnItem.hex }}
            </span>
            <span v-else class="status-pending">登録前（スキップ可）</span>
            <span class="chevron-icon" :class="{ rotated: activeStep === 2 }">▼</span>
          </div>
        </div>

        <div class="step-body" v-show="activeStep === 2">
          <OwnItemScanner 
            :season="selectedSeason" 
            :wb-gains="wbGains"
            @itemRegistered="onItemRegistered" 
            @requestNextStep="proceedToStepThree" 
          />

          <!-- Navigation buttons -->
          <div class="step-navigation">
            <button @click="setActiveStep(1)" class="btn btn-secondary">戻る</button>
            <button @click="setActiveStep(3)" class="btn btn-primary">
              提案とAI相談へ進む (スキップ)
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
            </button>
          </div>
        </div>
      </div>

      <!-- STEP 3: Suggested Outfit & AI Customizer -->
      <div class="step-card glass-panel" :class="{ 'is-active': activeStep === 3, 'disabled': !selectedSeason }">
        <div class="step-header" @click="selectedSeason && setActiveStep(3)">
          <div class="step-title-row">
            <span class="step-num">3</span>
            <h2>似合う服の提案 ＆ AIスタイリング相談</h2>
          </div>
          <!-- Status Badge -->
          <div class="step-status" v-if="selectedSeason">
            <div class="outfit-swatches-row" v-if="currentOutfit.tops">
              <div class="tiny-swatch" :style="{ backgroundColor: currentOutfit.tops.hex }" title="トップス"></div>
              <div class="tiny-swatch" :style="{ backgroundColor: currentOutfit.bottoms.hex }" title="ボトムス"></div>
              <div v-if="currentOutfit.outer" class="tiny-swatch" :style="{ backgroundColor: currentOutfit.outer.hex }" title="アウター"></div>
            </div>
            <span class="chevron-icon" :class="{ rotated: activeStep === 3 }">▼</span>
          </div>
          <div v-else class="step-status">
            <span class="status-locked">ロック中</span>
          </div>
        </div>

        <div class="step-body" v-show="activeStep === 3">
          <!-- Suggested Outfit layout -->
          <ColorSuggestion 
            ref="suggestionRef" 
            :season="selectedSeason" 
            :skinColor="userSkinColor"
            :ownedItem="registeredOwnItem"
            :occasion="currentOccasion"
            @outfitChanged="onOutfitChanged"
            @occasionChanged="onOccasionChanged"
          />

          <!-- AI Refiner Consultation window -->
          <div class="ai-consultation-section">
            <h3 class="section-divider-title">💬 AIスタイリング相談窓口</h3>
            <AiRefiner 
              :season="selectedSeason" 
              :currentOutfit="currentOutfit" 
              :ownedItem="registeredOwnItem"
              :occasion="currentOccasion"
              @refineOutfit="onRefineOutfit" 
            />
          </div>

          <!-- Navigation buttons -->
          <div class="step-navigation">
            <button @click="setActiveStep(2)" class="btn btn-secondary">
              手持ちアイテムの編集に戻る
            </button>
          </div>
        </div>
      </div>

    </main>

    <!-- Footer -->
    <footer class="app-footer">
      <p>&copy; 2026 PaletteMatch AI. 診断データや映像はすべてお使いのPC・スマートフォン内で完全に保護されています。</p>
    </footer>
  </div>
</template>

<script setup>
import { ref } from 'vue';

const activeStep = ref(1); // 1 = Diagnosis, 2 = Own Item Registration, 3 = Outfit & AI Refinement
const selectedSeason = ref('');
const userSkinColor = ref('');
const currentOutfit = ref({ tops: null, bottoms: null, outer: null });
const registeredOwnItem = ref(null);
const currentOccasion = ref('friendly');
const wbGains = ref({ r: 1.0, g: 1.0, b: 1.0 });

const suggestionRef = ref(null);

function setActiveStep(step) {
  activeStep.value = step;
}

function onSkinAnalyzed(data) {
  selectedSeason.value = data.season;
  userSkinColor.value = data.hex;
  if (data.wbGains) {
    wbGains.value = data.wbGains;
  }
  
  // Proceed to step 2 automatically
  setTimeout(() => {
    activeStep.value = 2;
  }, 450);
}

function selectSeasonManually(season) {
  selectedSeason.value = season;
  userSkinColor.value = ''; // Reset custom sampled hex to default palette mode
  wbGains.value = { r: 1.0, g: 1.0, b: 1.0 }; // Reset WB gains
  
  // Proceed to step 2 automatically
  setTimeout(() => {
    activeStep.value = 2;
  }, 350);
}

function onItemRegistered(data) {
  registeredOwnItem.value = {
    category: data.category,
    hex: data.hex
  };

  // Pre-seed matching outfit generated by color harmony in scanner
  if (data.suggestedOutfit) {
    setTimeout(() => {
      if (suggestionRef.value) {
        suggestionRef.value.updateOutfit({
          tops: data.suggestedOutfit.tops,
          bottoms: data.suggestedOutfit.bottoms,
          outer: data.suggestedOutfit.outer
        }, {
          category: data.category,
          hex: data.hex
        });
      }
    }, 100);
  }
}

function proceedToStepThree() {
  setTimeout(() => {
    activeStep.value = 3;
  }, 350);
}

function onOccasionChanged(occ) {
  currentOccasion.value = occ;
}

function onOutfitChanged(outfitData) {
  currentOutfit.value = outfitData;
}

function onRefineOutfit(newColors) {
  if (suggestionRef.value) {
    suggestionRef.value.updateOutfit(newColors);
  }
}

function getSeasonDisplayName(seasonId) {
  const names = {
    spring: 'スプリング (イエベ春)',
    summer: 'サマー (ブルベ夏)',
    autumn: 'オータム (イエベ秋)',
    winter: 'ウィンター (ブルベ冬)'
  };
  return names[seasonId] || '';
}

function getCategoryDisplayName(catId) {
  const categories = { tops: 'トップス', bottoms: 'ボトムス', outer: 'アウター' };
  return categories[catId] || '';
}
</script>

<style>
/* Layout styling */
.app-container {
  max-width: 720px;
  margin: 0 auto;
  padding: 2rem 1rem;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  min-height: 100vh;
}

.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.5rem;
}

.logo-area {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.logo-icon {
  width: 24px;
  height: 24px;
  color: var(--primary);
}

.gradient-text {
  background: linear-gradient(135deg, var(--primary) 30%, var(--accent) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  font-weight: 800;
}

.tagline {
  font-size: 0.8rem;
  color: var(--text-muted);
  font-weight: 500;
}

/* Privacy Banner */
.privacy-banner {
  display: flex;
  gap: 1rem;
  align-items: flex-start;
  background: #f0fdf4; /* Safe bright light green */
  border: 1px solid #dcfce7;
  padding: 1.25rem;
  border-radius: 16px;
}

.privacy-icon {
  color: #16a34a;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 0.15rem;
}

.privacy-text {
  font-size: 0.82rem;
  line-height: 1.5;
  color: #166534;
}

/* Wizard Pane */
.wizard-pane {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

/* Accordion Step Card */
.step-card {
  padding: 0;
  overflow: hidden;
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  border-color: rgba(0, 0, 0, 0.05);
}

.step-card.disabled {
  opacity: 0.6;
  pointer-events: none;
}

.step-card.disabled .step-header {
  cursor: not-allowed;
}

.step-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.25rem 1.75rem;
  cursor: pointer;
  user-select: none;
  background: rgba(0, 0, 0, 0.01);
  transition: background 0.2s ease;
}

.step-header:hover {
  background: rgba(0, 0, 0, 0.02);
}

.step-title-row {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.step-num {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: rgba(92, 98, 214, 0.1);
  color: var(--primary);
  font-weight: 800;
  font-size: 0.85rem;
}

.step-card.is-active .step-num {
  background: var(--primary);
  color: #fff;
}

.step-header h2 {
  font-size: 1.05rem;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: var(--text-color);
}

.step-status {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.status-pending {
  font-size: 0.75rem;
  color: var(--text-muted);
  background: rgba(0, 0, 0, 0.04);
  padding: 0.2rem 0.5rem;
  border-radius: 50px;
}

.status-locked {
  font-size: 0.75rem;
  color: var(--text-muted);
  background: rgba(0, 0, 0, 0.03);
  padding: 0.2rem 0.5rem;
  border-radius: 50px;
}

.chevron-icon {
  font-size: 0.65rem;
  color: var(--text-muted);
  transition: transform 0.3s ease;
}

.chevron-icon.rotated {
  transform: rotate(180deg);
}

/* Swatches Preview in Header */
.outfit-swatches-row {
  display: flex;
  gap: 0.25rem;
  background: rgba(0, 0, 0, 0.05);
  padding: 3px;
  border-radius: 50px;
}

.tiny-swatch {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.8);
}

.season-badge-sm {
  font-size: 0.7rem;
  font-weight: bold;
  padding: 0.2rem 0.6rem;
  border-radius: 50px;
  color: #fff;
}

.season-badge-sm.spring { background: linear-gradient(135deg, #ff7e5f, #feb47b); }
.season-badge-sm.summer { background: linear-gradient(135deg, #a1c4fd, #c2e9fb); color: #333; }
.season-badge-sm.autumn { background: linear-gradient(135deg, #d35400, #f39c12); }
.season-badge-sm.winter { background: linear-gradient(135deg, #7b1fa2, #e91e63); }

/* Accordion Body */
.step-body {
  padding: 0 1.75rem 1.75rem 1.75rem;
  border-top: 1px solid rgba(0, 0, 0, 0.03);
  animation: slideDown 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.ai-consultation-section {
  border-top: 2px dashed rgba(0, 0, 0, 0.05);
  padding-top: 1.5rem;
  margin-top: 0.75rem;
}

.section-divider-title {
  font-size: 1rem;
  font-weight: 800;
  color: var(--text-color);
  margin-bottom: 1.25rem;
  display: flex;
  align-items: center;
}

.step-navigation {
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
  border-top: 1px solid rgba(0, 0, 0, 0.05);
  padding-top: 1.25rem;
  margin-top: 0.5rem;
}

.step-navigation .btn {
  flex: 0 1 auto;
  min-width: 120px;
}

/* Manual picker styling inside Step 1 */
.manual-picker-section {
  border-top: 1px solid rgba(0, 0, 0, 0.05);
  padding-top: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.manual-picker-section h3 {
  font-size: 0.9rem;
  font-weight: bold;
  color: var(--text-color);
}

.picker-desc {
  font-size: 0.8rem;
  color: var(--text-muted);
}

.picker-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.5rem;
}

.picker-btn {
  padding: 0.65rem;
  border-radius: 8px;
  border: 1px solid rgba(0,0,0,0.06);
  background: rgba(0,0,0,0.01);
  color: var(--text-color);
  font-weight: bold;
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.picker-btn:hover {
  background: rgba(0,0,0,0.03);
}

.picker-btn.selected {
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.05);
}

.picker-btn.spring.selected {
  background: linear-gradient(135deg, rgba(255, 126, 95, 0.08), rgba(254, 180, 123, 0.08));
  border-color: #ff7e5f;
  color: #ff7e5f;
}

.picker-btn.summer.selected {
  background: linear-gradient(135deg, rgba(161, 196, 253, 0.08), rgba(194, 233, 251, 0.08));
  border-color: #5c62d6;
  color: #5c62d6;
}

.picker-btn.autumn.selected {
  background: linear-gradient(135deg, rgba(211, 84, 0, 0.08), rgba(243, 156, 18, 0.08));
  border-color: #d35400;
  color: #d35400;
}

.picker-btn.winter.selected {
  background: linear-gradient(135deg, rgba(123, 31, 162, 0.08), rgba(233, 30, 99, 0.08));
  border-color: #7b1fa2;
  color: #7b1fa2;
}

/* Footer styles */
.app-footer {
  text-align: center;
  padding: 1.5rem 0;
  border-top: 1px solid rgba(0,0,0,0.05);
  font-size: 0.75rem;
  color: var(--text-muted);
}

.owned-status-badge {
  font-size: 0.72rem;
  font-weight: bold;
  padding: 0.2rem 0.6rem;
  border-radius: 50px;
  background: var(--primary);
  color: #fff;
}

@keyframes slideDown {
  from { opacity: 0; transform: translateY(-8px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
