<template>
  <div class="color-suggestion-card">
    
    <!-- Outfit Configuration Toggles -->
    <div class="config-section">
      <div class="mode-selector">
        <span class="mode-label">アイテム構成：</span>
        <div class="toggle-buttons">
          <button 
            @click="setOutfitMode(false)" 
            class="toggle-btn" 
            :class="{ active: !includeOuter }"
          >
            トップス＆ボトムス
          </button>
          <button 
            @click="setOutfitMode(true)" 
            class="toggle-btn" 
            :class="{ active: includeOuter }"
          >
            アウター追加
          </button>
        </div>
      </div>

      <!-- TPO Occasion Selector -->
      <div class="mode-selector">
        <span class="mode-label">見せたい印象 (TPO)：</span>
        <div class="toggle-buttons scrollable-x">
          <button 
            v-for="occ in OCCASIONS"
            :key="occ.id"
            @click="emit('occasionChanged', occ.id)" 
            class="toggle-btn" 
            :class="{ active: occasion === occ.id }"
            :title="occ.desc"
          >
            {{ occ.icon }} {{ occ.name }}
          </button>
        </div>
      </div>

      <!-- Mannequin Style Customizer (Pill Selectors) -->
      <div class="style-customizer-row" v-if="season">
        <div class="style-control">
          <span class="ctrl-lbl">トップス袖丈：</span>
          <div class="style-selector">
            <button @click="topsType = 'short'" :class="{ active: topsType === 'short' }">半袖</button>
            <button @click="topsType = 'long'" :class="{ active: topsType === 'long' }">長袖</button>
          </div>
        </div>

        <div class="style-control">
          <span class="ctrl-lbl">ボトムス形状：</span>
          <div class="style-selector scrollable">
            <button @click="bottomsType = 'pants'" :class="{ active: bottomsType === 'pants' }">パンツ</button>
            <button @click="bottomsType = 'shorts'" :class="{ active: bottomsType === 'shorts' }">ハーフパンツ</button>
            <button @click="bottomsType = 'shortSkirt'" :class="{ active: bottomsType === 'shortSkirt' }">ミニスカ</button>
            <button @click="bottomsType = 'longSkirt'" :class="{ active: bottomsType === 'longSkirt' }">ロングスカ</button>
          </div>
        </div>

        <div class="style-control" v-if="includeOuter">
          <span class="ctrl-lbl">アウター形状：</span>
          <div class="style-selector">
            <button @click="outerType = 'tailored'" :class="{ active: outerType === 'tailored' }">テーラード</button>
            <button @click="outerType = 'zipup'" :class="{ active: outerType === 'zipup' }">ジップアップ</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Suggested Outfit Visual Showcase -->
    <div class="outfit-display-container" v-if="season">
      <!-- SVG Mannequin Display -->
      <div class="mannequin-wrapper">
        <svg viewBox="0 0 160 260" class="mannequin-svg">
          <!-- Guide lines for abstract sketch aesthetic -->
          <line x1="80" y1="10" x2="80" y2="250" stroke="rgba(0,0,0,0.03)" stroke-dasharray="2,4" />
          
          <!-- BASE SKIN LAYER (Drawn underneath so clothes naturally overlay it) -->
          <!-- Head -->
          <circle cx="80" cy="30" r="14" :fill="displaySkinColor" />
          
          <!-- Neck -->
          <line x1="80" y1="44" x2="80" y2="54" :stroke="displaySkinColor" stroke-width="6" stroke-linecap="round" />

          <!-- Torso Base (Skin base to prevent any underarm/hip gaps) -->
          <rect x="58" y="54" width="44" height="72" :fill="displaySkinColor" />

          <!-- Left Arm skin -->
          <line x1="58" y1="60" x2="36" y2="116" :stroke="displaySkinColor" stroke-width="8" stroke-linecap="round" />
          
          <!-- Right Arm skin -->
          <line x1="102" y1="60" x2="124" y2="116" :stroke="displaySkinColor" stroke-width="8" stroke-linecap="round" />

          <!-- Left Hand -->
          <circle cx="36" cy="116" r="5" :fill="displaySkinColor" />
          
          <!-- Right Hand -->
          <circle cx="124" cy="116" r="5" :fill="displaySkinColor" />

          <!-- Left Leg skin -->
          <line x1="68" y1="126" x2="68" y2="236" :stroke="displaySkinColor" stroke-width="10" stroke-linecap="butt" />
          
          <!-- Right Leg skin -->
          <line x1="92" y1="126" x2="92" y2="236" :stroke="displaySkinColor" stroke-width="10" stroke-linecap="butt" />

          <!-- Left Foot -->
          <path d="M 68,236 L 54,242 L 54,246 L 72,246 Z" :fill="displaySkinColor" />
          
          <!-- Right Foot -->
          <path d="M 92,236 L 106,242 L 106,246 L 88,246 Z" :fill="displaySkinColor" />

          <!-- BOTTOMS LAYER -->
          <!-- Long Pants -->
          <g v-if="bottomsType === 'pants' && currentOutfit.bottoms">
            <line x1="68" y1="126" x2="68" y2="232" :stroke="currentOutfit.bottoms.hex" stroke-width="12" stroke-linecap="butt" class="outfit-part" />
            <line x1="92" y1="126" x2="92" y2="232" :stroke="currentOutfit.bottoms.hex" stroke-width="12" stroke-linecap="butt" class="outfit-part" />
            <rect x="58" y="126" width="44" height="12" :fill="currentOutfit.bottoms.hex" class="outfit-part" />
          </g>
          <!-- Half Pants -->
          <g v-else-if="bottomsType === 'shorts' && currentOutfit.bottoms">
            <line x1="68" y1="126" x2="68" y2="185" :stroke="currentOutfit.bottoms.hex" stroke-width="12" stroke-linecap="butt" class="outfit-part" />
            <line x1="92" y1="126" x2="92" y2="185" :stroke="currentOutfit.bottoms.hex" stroke-width="12" stroke-linecap="butt" class="outfit-part" />
            <rect x="58" y="126" width="44" height="12" :fill="currentOutfit.bottoms.hex" class="outfit-part" />
          </g>
          <!-- Short Skirt -->
          <path 
            v-else-if="bottomsType === 'shortSkirt' && currentOutfit.bottoms"
            d="M 58,126 L 102,126 L 110,175 L 50,175 Z" 
            :fill="currentOutfit.bottoms.hex" 
            stroke="rgba(0,0,0,0.12)"
            stroke-width="1.2"
            class="outfit-part" 
          />
          <!-- Long Skirt -->
          <path 
            v-else-if="bottomsType === 'longSkirt' && currentOutfit.bottoms"
            d="M 58,126 L 102,126 L 114,225 L 46,225 Z" 
            :fill="currentOutfit.bottoms.hex" 
            stroke="rgba(0,0,0,0.12)"
            stroke-width="1.2"
            class="outfit-part" 
          />
          
          <!-- TOPS LAYER -->
          <!-- Tops Shirt Body -->
          <path 
            v-if="currentOutfit.tops"
            d="M 58,54 L 70,54 Q 80,62 90,54 L 102,54 L 102,126 L 58,126 Z" 
            :fill="currentOutfit.tops.hex" 
            stroke="rgba(0,0,0,0.12)"
            stroke-width="1.2"
            class="outfit-part"
          />
          
          <!-- Sleeves (Overlaying the base skin arm) -->
          <!-- Short Sleeve -->
          <g v-if="topsType === 'short' && currentOutfit.tops">
            <line x1="58" y1="60" x2="47" y2="82" :stroke="currentOutfit.tops.hex" stroke-width="10" stroke-linecap="round" class="outfit-part" />
            <line x1="102" y1="60" x2="113" y2="82" :stroke="currentOutfit.tops.hex" stroke-width="10" stroke-linecap="round" class="outfit-part" />
          </g>
          <!-- Long Sleeve -->
          <g v-else-if="topsType === 'long' && currentOutfit.tops">
            <line x1="58" y1="60" x2="38" y2="110" :stroke="currentOutfit.tops.hex" stroke-width="10" stroke-linecap="round" class="outfit-part" />
            <line x1="102" y1="60" x2="122" y2="110" :stroke="currentOutfit.tops.hex" stroke-width="10" stroke-linecap="round" class="outfit-part" />
          </g>

          <!-- OUTERWEAR LAYER (Layered on top of Tops) -->
          <g v-if="includeOuter && currentOutfit.outer">
            <!-- Jacket Sleeves (Long jackets) -->
            <line x1="58" y1="60" x2="37" y2="112" :stroke="currentOutfit.outer.hex" stroke-width="12" stroke-linecap="round" class="outfit-part" />
            <line x1="102" y1="60" x2="123" y2="112" :stroke="currentOutfit.outer.hex" stroke-width="12" stroke-linecap="round" class="outfit-part" />

            <!-- Tailored Jacket Body (Neck only open V) -->
            <g v-if="outerType === 'tailored'">
              <path 
                d="M 58,54 L 70,54 L 76,74 L 76,128 L 58,128 Z" 
                :fill="currentOutfit.outer.hex" 
                stroke="rgba(0,0,0,0.12)"
                stroke-width="1.2"
                class="outfit-part"
              />
              <path 
                d="M 102,54 L 90,54 L 84,74 L 84,128 L 102,128 Z" 
                :fill="currentOutfit.outer.hex" 
                stroke="rgba(0,0,0,0.12)"
                stroke-width="1.2"
                class="outfit-part"
              />
            </g>
            <!-- Zip-up Jacket Body (Center open down to waist) -->
            <g v-else-if="outerType === 'zipup'">
              <path 
                d="M 58,54 L 68,54 L 62,128 L 58,128 Z" 
                :fill="currentOutfit.outer.hex" 
                stroke="rgba(0,0,0,0.12)"
                stroke-width="1.2"
                class="outfit-part"
              />
              <path 
                d="M 102,54 L 92,54 L 98,128 L 102,128 Z" 
                :fill="currentOutfit.outer.hex" 
                stroke="rgba(0,0,0,0.12)"
                stroke-width="1.2"
                class="outfit-part"
              />
            </g>
          </g>
        </svg>
      </div>

      <!-- Color Cards Panel -->
      <div class="outfit-preview">
        <!-- Outer (Optional) -->
        <div 
          v-if="includeOuter" 
          class="preview-item outer-wear"
          :style="{ borderLeftColor: currentOutfit.outer?.hex }"
          :class="{ 'owned-item-glow': currentOutfit.outer?.isOwned }"
        >
          <div class="color-swatch-badge" :style="{ backgroundColor: currentOutfit.outer?.hex }"></div>
          <div class="item-info">
            <span class="item-tag">
              アウター
              <span v-if="currentOutfit.outer?.isOwned" class="owned-badge-label">手持ち</span>
            </span>
            <span class="item-name">{{ currentOutfit.outer?.name || '未選択' }}</span>
            <span class="item-hex">{{ currentOutfit.outer?.hex || '#---' }}</span>
          </div>
        </div>

        <!-- Tops -->
        <div 
          class="preview-item tops-wear"
          :style="{ borderLeftColor: currentOutfit.tops?.hex }"
          :class="{ 'owned-item-glow': currentOutfit.tops?.isOwned }"
        >
          <div class="color-swatch-badge" :style="{ backgroundColor: currentOutfit.tops?.hex }"></div>
          <div class="item-info">
            <span class="item-tag">
              トップス
              <span v-if="currentOutfit.tops?.isOwned" class="owned-badge-label">手持ち</span>
            </span>
            <span class="item-name">{{ currentOutfit.tops?.name || '未選択' }}</span>
            <span class="item-hex">{{ currentOutfit.tops?.hex || '#---' }}</span>
          </div>
        </div>

        <!-- Bottoms -->
        <div 
          class="preview-item bottoms-wear"
          :style="{ borderLeftColor: currentOutfit.bottoms?.hex }"
          :class="{ 'owned-item-glow': currentOutfit.bottoms?.isOwned }"
        >
          <div class="color-swatch-badge" :style="{ backgroundColor: currentOutfit.bottoms?.hex }"></div>
          <div class="item-info">
            <span class="item-tag">
              ボトムス
              <span v-if="currentOutfit.bottoms?.isOwned" class="owned-badge-label">手持ち</span>
            </span>
            <span class="item-name">{{ currentOutfit.bottoms?.name || '未選択' }}</span>
            <span class="item-hex">{{ currentOutfit.bottoms?.hex || '#---' }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Advice & Actions -->
    <div class="actions-and-advice" v-if="season">
      <div class="coord-info">
        <h4>コーディネートのアドバイス</h4>
        <p class="advice-text">{{ getSeasonAdvice() }}</p>
      </div>

      <!-- TPO Color Psychology Advice -->
      <div class="coord-info tpo-advice-box">
        <h4>💡 色彩心理アドバイス (TPO)</h4>
        <p class="advice-text tpo-desc">{{ getOccasionDescription() }}</p>
      </div>

      <button @click="generateRandomOutfit" class="btn btn-secondary randomize-btn">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>
        他の組み合わせにする（ランダム選択）
      </button>
    </div>
    
    <div v-else class="empty-state">
      <p>ステップ 1 で肌色を測定すると、ここにコーディネートが提案されます。</p>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, reactive, computed } from 'vue';

const props = defineProps({
  season: {
    type: String,
    default: ''
  },
  skinColor: {
    type: String,
    default: ''
  },
  ownedItem: {
    type: Object,
    default: null // { category: 'tops'|'bottoms'|'outer', hex: '#HEX' }
  },
  occasion: {
    type: String,
    default: 'friendly'
  }
});

const emit = defineEmits(['outfitChanged', 'occasionChanged']);

// Outfit shape types
const topsType = ref('short'); // 'short' | 'long'
const bottomsType = ref('pants'); // 'pants' | 'shorts' | 'shortSkirt' | 'longSkirt'
const outerType = ref('tailored'); // 'tailored' | 'zipup'

const includeOuter = ref(false);

const currentOutfit = reactive({
  tops: null,
  bottoms: null,
  outer: null
});

const displaySkinColor = computed(() => {
  if (props.skinColor) return props.skinColor;

  const defaults = {
    spring: '#FED6B3',
    summer: '#FFDFD3',
    autumn: '#E2B189',
    winter: '#FFF0E5'
  };
  return defaults[props.season] || '#E2B189';
});

const PALETTES = {
  spring: {
    tops: [
      { name: 'ピーチピンク', hex: '#FFB7B2' },
      { name: 'マリーゴールドゴールド', hex: '#FFD166' },
      { name: 'アップルグリーン', hex: '#A7C957' },
      { name: 'アプリコットオレンジ', hex: '#F3A712' },
      { name: 'アイボリーホワイト', hex: '#FFFDF6' },
      { name: 'コーラルピンク', hex: '#FF8B94' }
    ],
    bottoms: [
      { name: 'キャメル', hex: '#C68B59' },
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

const ADVICE = {
  spring: 'イエローベース春タイプは、明るく暖かみのあるカラー（イエベ系）を顔周りに持ってくることで、血色が良くフレッシュに見えます。ボトムスには少し落ち着いたキャメルやベージュを合わせると、全体のバランスがまとまります。',
  summer: 'ブルーベース夏タイプは、涼しげで柔らかいペールトーンやグレイッシュカラーがよく馴染みます。コントラストを強めすぎず、ラベンダーやオフホワイトのトップスに、ココアやソフトネイビーなどの穏やかな中間色ボトムスを合わせるのがおすすめです。',
  autumn: 'イエローベース秋タイプは、深みのあるリッチなアースカラーやディープトーンがとても似合います。オリーブやテラコッタといったこっくりした色のトップスに、サンドベージュやダークブラウンを合わせた温かみのある知的なコーディネートが得意です。',
  winter: 'ブルーベース冬タイプは、濁りのない鮮やかなビビッドカラーやコントラストの効いたモノトーン配色がスタイリッシュに映えます。真っ白やビビッドマゼンタなどのトップスに、コントラストを効かせた漆黒（ピュアブラック）を合わせることで、洗練された印象になります。'
};

function setOutfitMode(withOuter) {
  includeOuter.value = withOuter;
  generateRandomOutfit();
}

const OCCASIONS = [
  { id: 'business', name: 'ビジネス・知性', icon: '💼', desc: '誠実さと信頼感を与える、知的なフォーマル配色。プレゼンや面接、オフィススタイルに最適です。' },
  { id: 'friendly', name: '親しみ・カジュアル', icon: '😊', desc: '明るく柔らかいトーンで、親しみやすさと安心感を与える配色。初対面やカジュアルな集まりに最適です。' },
  { id: 'elegant', name: '洗練・デート', icon: '🥂', desc: 'コントラストを効かせたダーク系カラーで、大人っぽさと都会的な洗練さを演出。ディナーやデートにおすすめです。' },
  { id: 'relaxed', name: 'リラックス・自然体', icon: '🏕️', desc: 'ベージュやオリーブなどのアースカラーで、安心感と自然体な魅力を引き出します。休日や旅行に最適です。' }
];

function selectBestOccasionColor(part, candidates) {
  if (!candidates || candidates.length === 0) return { name: 'ホワイト', hex: '#FAF9F6' };
  
  const scored = candidates.map(item => {
    const { h, s, l } = hexToHsl(item.hex);
    let score = 0;

    if (props.occasion === 'business') {
      if (s < 0.16) score += 40; 
      if (h >= 195 && h <= 245 && s > 0.15) score += 50; 
      if (part === 'tops' && l > 0.85) score += 30; 
      if (part === 'bottoms' && l < 0.4) score += 30; 
      if (s > 0.6) score -= 50; 
    } 
    else if (props.occasion === 'friendly') {
      if (l > 0.58) score += 35;
      if (s > 0.35) score += 25;
      const isWarm = (h >= 10 && h <= 80) || (h >= 340 && h <= 360);
      if (isWarm) score += 30;
      if (s < 0.12 && l < 0.3) score -= 45; 
    } 
    else if (props.occasion === 'elegant') {
      if (l < 0.45) score += 40;
      if (s > 0.45) score += 20;
      if (h >= 250 && h <= 350) score += 25; 
      if (s < 0.1 && l < 0.15) score += 40; 
    } 
    else if (props.occasion === 'relaxed') {
      const isEarthColor = (h >= 20 && h <= 110);
      if (isEarthColor) score += 50;
      if (s > 0.1 && s < 0.55) score += 30; 
      if (l > 0.35 && l < 0.78) score += 20;
      if (s > 0.8) score -= 40; 
    }

    return { item, score };
  });

  scored.sort((a, b) => b.score - a.score);
  const topCandidates = scored.slice(0, Math.max(2, Math.floor(scored.length / 2))).map(x => x.item);
  return { ...topCandidates[Math.floor(Math.random() * topCandidates.length)] };
}

function generateRandomOutfit() {
  if (!props.season) return;
  const palette = PALETTES[props.season] || PALETTES.spring;

  if (props.ownedItem && props.ownedItem.category === 'tops') {
    currentOutfit.tops = { name: '手持ちのトップス', hex: props.ownedItem.hex, isOwned: true };
  } else {
    currentOutfit.tops = selectBestOccasionColor('tops', palette.tops);
  }

  if (props.ownedItem && props.ownedItem.category === 'bottoms') {
    currentOutfit.bottoms = { name: '手持ちのボトムス', hex: props.ownedItem.hex, isOwned: true };
  } else {
    currentOutfit.bottoms = selectBestOccasionColor('bottoms', palette.bottoms);
  }

  if (includeOuter.value) {
    if (props.ownedItem && props.ownedItem.category === 'outer') {
      currentOutfit.outer = { name: '手持ちのアウター', hex: props.ownedItem.hex, isOwned: true };
    } else {
      currentOutfit.outer = selectBestOccasionColor('outer', palette.outer);
    }
  } else {
    currentOutfit.outer = null;
  }

  notifyChange();
}

function getSeasonAdvice() {
  return ADVICE[props.season] || 'アドバイスが見つかりませんでした。';
}

function getOccasionDescription() {
  const current = OCCASIONS.find(o => o.id === props.occasion);
  return current ? current.desc : '';
}

function notifyChange() {
  emit('outfitChanged', {
    includeOuter: includeOuter.value,
    tops: currentOutfit.tops,
    bottoms: currentOutfit.bottoms,
    outer: currentOutfit.outer
  });
}

watch(() => props.season, (newSeason) => {
  if (newSeason) {
    generateRandomOutfit();
  }
}, { immediate: true });

watch(() => props.ownedItem, (newVal) => {
  if (newVal && newVal.category === 'outer') {
    includeOuter.value = true;
  }
  generateRandomOutfit();
}, { deep: true });

watch(() => props.occasion, () => {
  generateRandomOutfit();
});

defineExpose({
  updateOutfit(newColors, ownedItemInfo = null) {
    const activeOwnedItem = ownedItemInfo || props.ownedItem;

    if (newColors.tops) {
      if (activeOwnedItem && activeOwnedItem.category === 'tops') {
        currentOutfit.tops = { name: '手持ちのトップス', hex: activeOwnedItem.hex, isOwned: true };
      } else {
        currentOutfit.tops = newColors.tops;
      }
    }
    if (newColors.bottoms) {
      if (activeOwnedItem && activeOwnedItem.category === 'bottoms') {
        currentOutfit.bottoms = { name: '手持ちのボトムス', hex: activeOwnedItem.hex, isOwned: true };
      } else {
        currentOutfit.bottoms = newColors.bottoms;
      }
    }
    if (activeOwnedItem && activeOwnedItem.category === 'outer') {
      includeOuter.value = true;
    }
    if (newColors.outer && includeOuter.value) {
      if (activeOwnedItem && activeOwnedItem.category === 'outer') {
        currentOutfit.outer = { name: '手持ちのアウター', hex: activeOwnedItem.hex, isOwned: true };
      } else {
        currentOutfit.outer = newColors.outer;
      }
    }
    notifyChange();
  }
});

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
</script>

<style scoped>
.color-suggestion-card {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  width: 100%;
}

.config-section {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.mode-selector {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: rgba(0, 0, 0, 0.015);
  padding: 0.5rem 0.75rem;
  border-radius: 8px;
  border: 1px solid rgba(0, 0, 0, 0.04);
}

.mode-label {
  font-size: 0.85rem;
  color: var(--text-muted);
  font-weight: 600;
}

.toggle-buttons {
  display: flex;
  gap: 0.25rem;
  background: rgba(0, 0, 0, 0.05);
  padding: 2px;
  border-radius: 6px;
}

.toggle-btn {
  background: transparent;
  border: none;
  color: var(--text-muted);
  font-size: 0.8rem;
  padding: 0.35rem 0.75rem;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s ease;
}

.toggle-btn.active {
  background: var(--primary);
  color: #fff;
  font-weight: 600;
  box-shadow: 0 2px 6px rgba(92,98,214,0.15);
}

/* Style Customizer styling */
.style-customizer-row {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  background: rgba(0, 0, 0, 0.01);
  border: 1px solid rgba(0,0,0,0.03);
  padding: 0.75rem;
  border-radius: 10px;
}

.style-control {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.ctrl-lbl {
  font-size: 0.78rem;
  color: var(--text-muted);
  font-weight: 600;
  flex-shrink: 0;
}

.style-selector {
  display: flex;
  gap: 0.25rem;
  background: rgba(0,0,0,0.03);
  padding: 2px;
  border-radius: 6px;
}

.style-selector.scrollable {
  max-width: 100%;
  overflow-x: auto;
}

.style-selector button {
  background: transparent;
  border: none;
  font-size: 0.75rem;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  color: var(--text-muted);
  cursor: pointer;
  font-weight: 500;
  white-space: nowrap;
  transition: all 0.2s ease;
}

.style-selector button.active {
  background: #fff;
  color: var(--primary);
  font-weight: bold;
  box-shadow: 0 1px 3px rgba(0,0,0,0.05);
}

/* Mannequin Integration Layout */
.outfit-display-container {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  align-items: center;
  width: 100%;
  padding: 0.5rem 0;
}

@media (min-width: 480px) {
  .outfit-display-container {
    display: grid;
    grid-template-columns: 140px 1fr;
    gap: 1.5rem;
    align-items: center;
  }
}

.mannequin-wrapper {
  width: 140px;
  height: 220px;
  background: rgba(0, 0, 0, 0.015);
  border: 1px solid rgba(0, 0, 0, 0.04);
  border-radius: 12px;
  padding: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: inset 0 2px 8px rgba(0,0,0,0.03);
}

.mannequin-svg {
  width: 100%;
  height: 100%;
  max-height: 200px;
}

.outfit-part {
  transition: fill 0.35s ease, stroke 0.35s ease;
}

.outfit-preview {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  width: 100%;
  animation: fadeIn 0.4s ease-out;
}

.preview-item {
  border-radius: 8px;
  padding: 0.75rem;
  background: rgba(0, 0, 0, 0.015);
  border: 1px solid rgba(0, 0, 0, 0.04);
  border-left: 5px solid rgba(0,0,0,0.15);
  display: flex;
  align-items: center;
  gap: 0.75rem;
  transition: all 0.2s ease;
}

.preview-item:hover {
  background: rgba(0, 0, 0, 0.03);
  transform: translateX(2px);
}

.color-swatch-badge {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: 1.5px solid rgba(255,255,255,0.8);
  box-shadow: 0 2px 6px rgba(0,0,0,0.08);
  transition: background-color 0.35s ease;
  flex-shrink: 0;
}

.item-info {
  display: flex;
  flex-direction: column;
  gap: 0.05rem;
}

.item-tag {
  font-size: 0.65rem;
  text-transform: uppercase;
  color: var(--accent);
  font-weight: 700;
  letter-spacing: 0.05em;
}

.item-name {
  font-size: 0.85rem;
  font-weight: bold;
  color: var(--text-color);
}

.item-hex {
  font-family: var(--font-mono);
  font-size: 0.75rem;
  color: var(--text-muted);
}

.actions-and-advice {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  border-top: 1px solid rgba(0,0,0,0.05);
  padding-top: 1.25rem;
}

.coord-info h4 {
  font-size: 0.85rem;
  color: var(--text-muted);
  font-weight: bold;
}

.advice-text {
  font-size: 0.85rem;
  line-height: 1.55;
  color: var(--text-muted);
  margin-top: 0.35rem;
}

.randomize-btn {
  width: 100%;
}

.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  flex-grow: 1;
  color: var(--text-muted);
  font-size: 0.9rem;
  padding: 2rem;
  border: 2px dashed rgba(0,0,0,0.04);
  border-radius: 12px;
}

.preview-item.owned-item-glow {
  border-left-width: 8px;
  background: rgba(92, 98, 214, 0.03);
}

.owned-badge-label {
  background: var(--primary);
  color: white;
  padding: 0.1rem 0.35rem;
  border-radius: 4px;
  font-size: 0.58rem;
  font-weight: 800;
  margin-left: 0.35rem;
  display: inline-block;
  vertical-align: middle;
  line-height: 1;
}

.toggle-buttons.scrollable-x {
  max-width: 100%;
  overflow-x: auto;
  white-space: nowrap;
  -ms-overflow-style: none;
  scrollbar-width: none; 
}
.toggle-buttons.scrollable-x::-webkit-scrollbar {
  display: none;
}

.tpo-advice-box {
  border-top: 1px dashed rgba(0, 0, 0, 0.05);
  margin-top: 0.75rem;
  padding-top: 0.75rem;
}

.tpo-desc {
  color: var(--primary) !important;
  font-weight: 600 !important;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(5px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
