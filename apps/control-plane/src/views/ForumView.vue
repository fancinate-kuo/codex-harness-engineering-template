<template>
  <div class="sora-page">
    <header :class="['sora-header', { 'is-compact': isCompactHeader }]">
      <a class="sora-wordmark" href="#discover" aria-label="Sora 首頁" @click.prevent="selectCategory('all')">
        <span class="sora-wordmark-dot" aria-hidden="true"></span>
        <span>Sora</span>
      </a>

      <nav class="sora-nav" aria-label="主要導覽">
        <a href="#discover">探索</a>
        <a href="#trending">熱門</a>
        <a href="#about">關於 Sora</a>
      </nav>

      <div class="sora-header-actions">
        <RouterLink class="control-plane-link" to="/">管理後台</RouterLink>
        <button class="header-search" type="button" aria-label="開啟搜尋" @click="openSearch">
          <svg aria-hidden="true" viewBox="0 0 20 20" fill="none">
            <circle cx="8.5" cy="8.5" r="5.5" stroke="currentColor" stroke-width="1.7" />
            <path d="m13 13 4 4" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" />
          </svg>
          <span>搜尋 Sora</span>
          <kbd>⌘ K</kbd>
        </button>

        <div v-if="isLoggedIn" class="user-menu-wrap">
          <button class="user-button" type="button" aria-label="使用者選單" @click="showUserMenu = !showUserMenu">
            <span class="user-avatar">林</span>
            <svg aria-hidden="true" viewBox="0 0 16 16" fill="none">
              <path d="m4 6 4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </button>
          <div v-if="showUserMenu" class="user-menu" role="menu">
            <div class="user-menu-intro">
              <span class="user-avatar large">林</span>
              <div>
                <strong>林子晴</strong>
                <span>探索者會員</span>
              </div>
            </div>
            <button type="button" role="menuitem" @click="selectCategory('saved')">我的收藏 <span>⌘</span></button>
            <button type="button" role="menuitem" @click="selectCategory('following')">已追蹤作者 <span>→</span></button>
            <div class="user-menu-divider"></div>
            <button type="button" role="menuitem" @click="logout">登出</button>
          </div>
        </div>
        <button v-else class="login-button" type="button" @click="openLogin">登入</button>
      </div>

      <div v-if="searchOpen" class="search-popover" role="dialog" aria-label="搜尋 Sora" @click.stop>
        <div class="search-input-wrap">
          <svg aria-hidden="true" viewBox="0 0 20 20" fill="none">
            <circle cx="8.5" cy="8.5" r="5.5" stroke="currentColor" stroke-width="1.7" />
            <path d="m13 13 4 4" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" />
          </svg>
          <input
            ref="searchInput"
            v-model="searchQuery"
            type="search"
            placeholder="搜尋文章、主題或作者"
            aria-label="搜尋文章、主題或作者"
            @keydown.enter="submitSearch"
          />
          <button type="button" aria-label="關閉搜尋" @click="closeSearch">Esc</button>
        </div>
        <div class="search-popover-body">
          <p class="search-label">熱門搜尋</p>
          <div class="search-chips">
            <button v-for="term in suggestedSearches" :key="term" type="button" @click="runSearch(term)">
              {{ term }}
            </button>
          </div>
          <template v-if="recentSearches.length">
            <p class="search-label recent-label">最近搜尋</p>
            <button v-for="term in recentSearches" :key="`recent-${term}`" class="recent-search" type="button" @click="runSearch(term)">
              <span>↗</span>{{ term }}
            </button>
          </template>
          <p class="search-label recent-label">探索分類</p>
          <div class="search-category-links">
            <button v-for="category in primaryCategories" :key="category.key" type="button" @click="selectCategory(category.key)">
              <span :style="{ background: category.color }"></span>{{ category.label }}
            </button>
          </div>
        </div>
      </div>
    </header>

    <main class="sora-content">
      <section class="sora-intro" aria-labelledby="page-title">
        <div>
          <p class="eyebrow"><span></span>今日，在 Sora</p>
          <h1 id="page-title">值得思考的事，<br /><em>值得被分享。</em></h1>
        </div>
        <p class="intro-copy">一個讓好奇心慢下來的地方。<br />和一群願意深聊的人，交換觀點。</p>
      </section>

      <div class="sora-layout">
        <aside class="left-rail" aria-label="論壇分類">
          <section class="rail-section">
            <button class="mobile-section-toggle" type="button" :aria-expanded="mobileCategoriesOpen" @click="mobileCategoriesOpen = !mobileCategoriesOpen">
              <span>瀏覽分類</span>
              <svg aria-hidden="true" viewBox="0 0 16 16" fill="none"><path d="m4 6 4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" /></svg>
            </button>
            <div :class="['rail-content', { 'is-collapsed': !mobileCategoriesOpen }]">
              <div class="rail-heading">
                <p class="rail-kicker">BROWSE</p>
                <span>01</span>
              </div>
              <nav class="category-list" aria-label="主題分類">
                <button
                  v-for="category in categories"
                  :key="category.key"
                  :class="['category-link', { active: activeCategory === category.key }]"
                  type="button"
                  @click="selectCategory(category.key)"
                >
                  <span class="category-icon" :style="{ color: category.color }">{{ category.glyph }}</span>
                  <span class="category-label">{{ category.label }}</span>
                  <span class="category-count">{{ category.count }}</span>
                </button>
              </nav>

              <div class="rail-divider"></div>
              <p class="rail-kicker">YOUR SORA</p>
              <nav class="category-list personal-list" aria-label="個人收藏與追蹤">
                <button
                  v-for="category in personalCategories"
                  :key="category.key"
                  :class="['category-link', { active: activeCategory === category.key }]"
                  type="button"
                  @click="selectCategory(category.key)"
                >
                  <span class="category-icon" :style="{ color: category.color }">{{ category.glyph }}</span>
                  <span class="category-label">{{ category.label }}</span>
                  <span class="category-count">{{ category.count }}</span>
                </button>
              </nav>
            </div>
          </section>

          <div class="rail-note">
            <span class="note-orbit" aria-hidden="true"></span>
            <p>今天也留一點時間，<br />給還沒想完的問題。</p>
          </div>
        </aside>

        <section id="discover" class="feed-column" aria-labelledby="feed-title">
          <div class="feed-toolbar">
            <div>
              <p class="section-index">SORA / DISCOVER</p>
              <h2 id="feed-title">{{ activeCategoryLabel }}</h2>
            </div>
            <div class="feed-meta">
              <span>{{ filteredArticles.length }} 篇文章</span>
              <button type="button" aria-label="重新整理文章列表" @click="refreshFeed">
                <svg aria-hidden="true" viewBox="0 0 18 18" fill="none"><path d="M14.5 6.5A5.5 5.5 0 1 0 15 10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" /><path d="M14.5 3v3.5H11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" /></svg>
              </button>
            </div>
          </div>

          <div v-if="searchQuery" class="active-search">
            <span>搜尋結果</span>
            <strong>「{{ searchQuery }}」</strong>
            <button type="button" @click="clearSearch">清除</button>
          </div>

          <article
            v-if="featuredArticle"
            class="featured-article"
            tabindex="0"
            role="button"
            :aria-label="`閱讀精選文章：${featuredArticle.title}`"
            @click="openArticle(featuredArticle)"
            @keydown.enter="openArticle(featuredArticle)"
          >
            <div class="featured-art art-sky">
              <span class="art-orb orb-one"></span>
              <span class="art-orb orb-two"></span>
              <span class="art-line line-one"></span>
              <span class="art-line line-two"></span>
              <span class="art-caption">SORA / 001</span>
              <span class="art-caption art-caption-right">FEATURED</span>
            </div>
            <div class="featured-copy">
              <div class="article-label"><span class="label-dot sky"></span>{{ featuredArticle.category }} <span>精選</span></div>
              <h3>{{ featuredArticle.title }}</h3>
              <p>{{ featuredArticle.excerpt }}</p>
              <div class="article-footer">
                <div class="author-block">
                  <span :class="['author-avatar', featuredArticle.author.tone]">{{ featuredArticle.author.initials }}</span>
                  <span>{{ featuredArticle.author.name }}</span>
                </div>
                <span>{{ featuredArticle.time }} · {{ featuredArticle.reads }} 閱讀</span>
              </div>
            </div>
          </article>

          <div v-if="feedArticles.length" class="article-list">
            <article v-for="article in feedArticles" :key="article.id" class="article-row" tabindex="0" role="button" :aria-label="`閱讀文章：${article.title}`" @click="openArticle(article)" @keydown.enter="openArticle(article)">
              <div class="article-copy">
                <div class="article-label"><span :class="['label-dot', article.colorClass]"></span>{{ article.category }} <span>· {{ article.time }}</span></div>
                <h3>{{ article.title }}</h3>
                <p>{{ article.excerpt }}</p>
                <div class="article-footer">
                  <div class="author-block">
                    <span :class="['author-avatar', article.author.tone]">{{ article.author.initials }}</span>
                    <span>{{ article.author.name }}</span>
                  </div>
                  <span>{{ article.reads }} 閱讀 · {{ article.replies }} 回覆</span>
                </div>
              </div>
              <button :class="['save-button', { saved: article.bookmarked }]" type="button" :aria-label="article.bookmarked ? `取消收藏：${article.title}` : `收藏：${article.title}`" @click.stop="toggleBookmark(article)">
                <svg aria-hidden="true" viewBox="0 0 20 20" fill="none"><path d="M5.5 3.5h9a1 1 0 0 1 1 1v12l-5-2.8-5 2.8v-12a1 1 0 0 1 1-1Z" :fill="article.bookmarked ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" /></svg>
              </button>
            </article>
          </div>

          <div v-else class="empty-state">
            <span class="empty-state-mark">⌁</span>
            <h3>還沒有找到完全相同的答案。</h3>
            <p>試試這些方向，也許下一篇剛好就在那裡。</p>
            <div class="empty-suggestions">
              <button v-for="term in noResultSuggestions" :key="term" type="button" @click="runSearch(term)">{{ term }} <span>↗</span></button>
            </div>
          </div>

          <p class="feed-endnote"><span></span>持續更新中 · 每天 09:00</p>
        </section>

        <aside id="trending" class="right-rail" aria-label="熱門文章">
          <section class="rail-section trending-section">
            <button class="mobile-section-toggle" type="button" :aria-expanded="mobileTrendingOpen" @click="mobileTrendingOpen = !mobileTrendingOpen">
              <span>熱門文章</span>
              <svg aria-hidden="true" viewBox="0 0 16 16" fill="none"><path d="m4 6 4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" /></svg>
            </button>
            <div :class="['rail-content', { 'is-collapsed': !mobileTrendingOpen }]">
              <div class="rail-heading">
                <p class="rail-kicker">TRENDING NOW</p>
                <span>02</span>
              </div>
              <div class="trending-list">
                <button v-for="(article, index) in trendingArticles" :key="article.id" class="trending-item" type="button" @click="openArticle(article)">
                  <span class="trending-rank">{{ String(index + 1).padStart(2, '0') }}</span>
                  <span class="trending-content">
                    <strong>{{ article.title }}</strong>
                    <span>{{ article.category }} · {{ article.reads }} 閱讀</span>
                  </span>
                  <span class="trending-arrow">↗</span>
                </button>
              </div>
              <a class="text-link" href="#discover" @click.prevent="selectCategory('all')">查看全部熱門 <span>→</span></a>
            </div>
          </section>

          <section id="about" class="community-card">
            <div class="community-icon" aria-hidden="true"><span></span><span></span><span></span></div>
            <p class="rail-kicker">A SMALL COMMUNITY</p>
            <h3>好奇心，<br /><em>不需要理由。</em></h3>
            <p>目前有 12,408 位探索者，在這裡分享正在思考的事。</p>
            <button type="button" @click="isLoggedIn ? selectCategory('following') : openLogin()">加入 Sora <span>→</span></button>
          </section>
        </aside>
      </div>
    </main>

    <Transition name="drawer">
      <div v-if="selectedArticle" class="drawer-layer">
        <button class="drawer-backdrop" type="button" aria-label="關閉文章預覽" @click="closeArticle"></button>
        <aside class="article-drawer" role="dialog" aria-modal="true" :aria-label="`文章預覽：${selectedArticle.title}`">
          <div class="drawer-topbar">
            <span class="drawer-kicker">SORA / ARTICLE PREVIEW</span>
            <button class="close-button" type="button" aria-label="關閉文章預覽" @click="closeArticle">
              <svg aria-hidden="true" viewBox="0 0 20 20" fill="none"><path d="m5 5 10 10M15 5 5 15" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" /></svg>
            </button>
          </div>
          <div class="drawer-art art-sky">
            <span class="art-orb orb-one"></span>
            <span class="art-orb orb-two"></span>
            <span class="art-line line-one"></span>
            <span class="art-line line-two"></span>
            <span class="art-caption">{{ selectedArticle.category.toUpperCase() }}</span>
          </div>
          <div class="drawer-body">
            <div class="article-label"><span :class="['label-dot', selectedArticle.colorClass]"></span>{{ selectedArticle.category }} <span>· {{ selectedArticle.time }}</span></div>
            <h2>{{ selectedArticle.title }}</h2>
            <p class="drawer-lede">{{ selectedArticle.excerpt }}</p>
            <div class="drawer-author">
              <span :class="['author-avatar', 'large', selectedArticle.author.tone]">{{ selectedArticle.author.initials }}</span>
              <div>
                <strong>{{ selectedArticle.author.name }}</strong>
                <span>{{ selectedArticle.author.bio }}</span>
              </div>
              <button :class="['follow-button', { following: selectedArticle.author.following }]" type="button" @click="toggleFollow(selectedArticle.author.name)">{{ selectedArticle.author.following ? '已追蹤' : '追蹤' }}</button>
            </div>
            <div class="drawer-stats"><span>{{ selectedArticle.reads }} 閱讀</span><span>{{ selectedArticle.replies }} 回覆</span><span>約 {{ selectedArticle.duration }} 分鐘</span></div>
            <div class="drawer-placeholder">
              <p>「{{ selectedArticle.pullQuote }}」</p>
              <span>— {{ selectedArticle.author.name }}</span>
            </div>
            <div class="drawer-actions">
              <button class="primary-action" type="button" @click="toggleBookmark(selectedArticle)">{{ selectedArticle.bookmarked ? '已收藏文章' : '收藏文章' }} <span>⌘</span></button>
              <button class="secondary-action" type="button" @click="closeArticle">稍後閱讀</button>
            </div>
          </div>
        </aside>
      </div>
    </Transition>

    <Transition name="modal">
      <div v-if="showLogin" class="modal-layer" @click.self="closeLogin">
        <section class="login-card" role="dialog" aria-modal="true" aria-labelledby="login-title">
          <button class="close-button modal-close" type="button" aria-label="關閉登入視窗" @click="closeLogin">
            <svg aria-hidden="true" viewBox="0 0 20 20" fill="none"><path d="m5 5 10 10M15 5 5 15" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" /></svg>
          </button>
          <span class="login-mark"><span></span></span>
          <p class="eyebrow"><span></span>WELCOME TO SORA</p>
          <h2 id="login-title">把喜歡的想法，<br /><em>留在身邊。</em></h2>
          <p class="login-copy">登入後即可收藏文章、追蹤作者，<br />也可以加入這場慢一點的對話。</p>
          <button class="apple-login" type="button" @click="demoAppleLogin"><span aria-hidden="true">●</span>使用 Apple 登入</button>
          <div class="login-divider"><span>或使用 Email</span></div>
          <form @submit.prevent="submitLogin">
            <label for="login-email">電子郵件</label>
            <input id="login-email" v-model="loginEmail" type="email" placeholder="name@example.com" autocomplete="email" required />
            <p v-if="loginError" class="login-error" role="alert">{{ loginError }}</p>
            <button class="email-login" type="submit">繼續 <span>→</span></button>
          </form>
          <p class="demo-note">展示用登入 · 不會傳送或保存真實資料</p>
        </section>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

type CategoryKey = 'all' | 'technology' | 'design' | 'life' | 'photo' | 'developer' | 'saved' | 'following'

type Author = {
  name: string
  initials: string
  tone: string
  bio: string
  following: boolean
}

type Article = {
  id: number
  category: string
  categoryKey: Exclude<CategoryKey, 'all' | 'saved' | 'following'>
  title: string
  excerpt: string
  author: Author
  time: string
  reads: string
  replies: number
  duration: number
  pullQuote: string
  colorClass: string
  bookmarked: boolean
  featured?: boolean
}

const categories = [
  { key: 'all' as CategoryKey, label: '全部文章', count: '286', glyph: '✦', color: '#171717' },
  { key: 'technology' as CategoryKey, label: '科技', count: '84', glyph: '⌘', color: '#5b79ff' },
  { key: 'design' as CategoryKey, label: '設計', count: '61', glyph: '◒', color: '#dd7e55' },
  { key: 'life' as CategoryKey, label: '生活', count: '42', glyph: '◌', color: '#6caa8a' },
  { key: 'photo' as CategoryKey, label: '攝影', count: '38', glyph: '▧', color: '#aa83da' },
  { key: 'developer' as CategoryKey, label: '開發者', count: '58', glyph: '</>', color: '#e5a446' }
]

const personalCategories = [
  { key: 'saved' as CategoryKey, label: '我的收藏', count: '12', glyph: '♡', color: '#de6f76' },
  { key: 'following' as CategoryKey, label: '已追蹤', count: '08', glyph: '↗', color: '#6f8cda' }
]

const primaryCategories = categories.slice(1)
const suggestedSearches = ['AI 的下一個十年', '留白的力量', '慢生活提案']
const noResultSuggestions = ['AI', '設計', '生活']

const articles = ref<Article[]>([
  {
    id: 1,
    category: '科技',
    categoryKey: 'technology',
    title: '當科技變得安靜，我們終於聽見自己',
    excerpt: '真正好的科技，不是讓生活更快，而是讓我們把注意力放回真正重要的地方。',
    author: { name: '陳以安', initials: 'EA', tone: 'tone-sky', bio: '寫關於科技與人的距離。', following: false },
    time: '12 分鐘前',
    reads: '2.4k',
    replies: 84,
    duration: 8,
    pullQuote: '科技的終點，也許不是更多，而是剛剛好。',
    colorClass: 'sky',
    bookmarked: false,
    featured: true
  },
  {
    id: 2,
    category: '設計',
    categoryKey: 'design',
    title: '留白不是空白，是給想法呼吸的地方',
    excerpt: '從一張海報到一個產品，少一點，有時候才更接近想說的話。',
    author: { name: '蘇菲亞', initials: 'SF', tone: 'tone-peach', bio: '產品設計師，練習留白。', following: true },
    time: '28 分鐘前',
    reads: '1.8k',
    replies: 36,
    duration: 6,
    pullQuote: '設計不是填滿畫面，而是留下對的空間。',
    colorClass: 'peach',
    bookmarked: true
  },
  {
    id: 3,
    category: '生活',
    categoryKey: 'life',
    title: '我們為什麼需要一個沒有通知的下午？',
    excerpt: '把手機翻面，不是逃離世界，是重新決定什麼值得被看見。',
    author: { name: '林子晴', initials: 'LZ', tone: 'tone-green', bio: '在城市裡練習慢下來。', following: false },
    time: '1 小時前',
    reads: '1.2k',
    replies: 28,
    duration: 5,
    pullQuote: '安靜不是沒有發生事情，而是終於有空感覺。',
    colorClass: 'green',
    bookmarked: false
  },
  {
    id: 4,
    category: '攝影',
    categoryKey: 'photo',
    title: '光落下來以前，房間已經知道今天的顏色',
    excerpt: '攝影有時不是捕捉，而是等待一個場景把自己交出來。',
    author: { name: '周野', initials: 'ZY', tone: 'tone-violet', bio: '拍攝日常裡不急著說話的光。', following: false },
    time: '2 小時前',
    reads: '986',
    replies: 19,
    duration: 4,
    pullQuote: '最好的照片，是你差一點就錯過的那一刻。',
    colorClass: 'violet',
    bookmarked: false
  },
  {
    id: 5,
    category: '開發者',
    categoryKey: 'developer',
    title: '寫給未來自己的第一行程式碼',
    excerpt: '在工具越來越聰明的時代，保留一點親手理解的笨拙。',
    author: { name: '高橋悠', initials: 'TY', tone: 'tone-gold', bio: '寫程式，也寫給明天的自己。', following: true },
    time: '3 小時前',
    reads: '842',
    replies: 42,
    duration: 7,
    pullQuote: '理解一件事的最好方式，仍然是把它做出來。',
    colorClass: 'gold',
    bookmarked: false
  },
  {
    id: 6,
    category: '科技',
    categoryKey: 'technology',
    title: 'AI 會留下什麼，給那些不急著被取代的人？',
    excerpt: '答案也許不在更快學會工具，而在重新想像我們想成為誰。',
    author: { name: '王若彤', initials: 'WT', tone: 'tone-blue', bio: '研究 AI、創作與工作的縫隙。', following: false },
    time: '5 小時前',
    reads: '764',
    replies: 31,
    duration: 9,
    pullQuote: '當機器學會生成，我們更需要練習選擇。',
    colorClass: 'blue',
    bookmarked: false
  }
])

const activeCategory = ref<CategoryKey>('all')
const searchQuery = ref('')
const recentSearches = ref<string[]>(['數位留白', '創作工具'])
const searchOpen = ref(false)
const searchInput = ref<HTMLInputElement | null>(null)
const showLogin = ref(false)
const loginEmail = ref('')
const loginError = ref('')
const isLoggedIn = ref(false)
const showUserMenu = ref(false)
const selectedArticle = ref<Article | null>(null)
const isCompactHeader = ref(false)
const mobileCategoriesOpen = ref(true)
const mobileTrendingOpen = ref(false)

const activeCategoryLabel = computed(() => {
  if (activeCategory.value === 'saved') return '我的收藏'
  if (activeCategory.value === 'following') return '已追蹤'
  return categories.find(category => category.key === activeCategory.value)?.label ?? '全部文章'
})

const filteredArticles = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()
  return articles.value.filter(article => {
    const matchesCategory = activeCategory.value === 'all'
      || (activeCategory.value === 'saved' && article.bookmarked)
      || (activeCategory.value === 'following' && article.author.following)
      || article.categoryKey === activeCategory.value
    const matchesSearch = !query || [article.title, article.excerpt, article.category, article.author.name].some(value => value.toLowerCase().includes(query))
    return matchesCategory && matchesSearch
  })
})

const featuredArticle = computed(() => {
  if (searchQuery.value || activeCategory.value !== 'all') return null
  return articles.value.find(article => article.featured) ?? null
})

const feedArticles = computed(() => filteredArticles.value.filter(article => article.id !== featuredArticle.value?.id))

const trendingArticles = computed(() => {
  const order = [2, 6, 3, 4]
  return order.map(id => articles.value.find(article => article.id === id)).filter((article): article is Article => Boolean(article)).filter(article => {
    const query = searchQuery.value.trim().toLowerCase()
    return !query || [article.title, article.category, article.author.name].some(value => value.toLowerCase().includes(query))
  })
})

function selectCategory(category: CategoryKey) {
  if ((category === 'saved' || category === 'following') && !isLoggedIn.value) {
    openLogin()
    return
  }
  activeCategory.value = category
  searchQuery.value = ''
  searchOpen.value = false
  showUserMenu.value = false
}

function openSearch() {
  searchOpen.value = true
  showUserMenu.value = false
  requestAnimationFrame(() => searchInput.value?.focus())
}

function closeSearch() {
  searchOpen.value = false
}

function runSearch(term: string) {
  searchQuery.value = term
  activeCategory.value = 'all'
  searchOpen.value = false
  if (!recentSearches.value.includes(term)) recentSearches.value = [term, ...recentSearches.value].slice(0, 3)
}

function submitSearch() {
  if (!searchQuery.value.trim()) return
  runSearch(searchQuery.value.trim())
}

function clearSearch() {
  searchQuery.value = ''
  activeCategory.value = 'all'
}

function refreshFeed() {
  const current = articles.value
  articles.value = []
  requestAnimationFrame(() => { articles.value = current })
}

function openArticle(article: Article) {
  selectedArticle.value = article
  showUserMenu.value = false
}

function closeArticle() {
  selectedArticle.value = null
}

function toggleBookmark(article: Article) {
  if (!isLoggedIn.value) {
    openLogin()
    return
  }
  article.bookmarked = !article.bookmarked
}

function toggleFollow(authorName: string) {
  if (!isLoggedIn.value) {
    openLogin()
    return
  }
  articles.value.forEach(article => {
    if (article.author.name === authorName) article.author.following = !article.author.following
  })
}

function openLogin() {
  showLogin.value = true
  loginError.value = ''
  showUserMenu.value = false
}

function closeLogin() {
  showLogin.value = false
  loginError.value = ''
}

function finishLogin() {
  isLoggedIn.value = true
  localStorage.setItem('sora-demo-user', 'signed-in')
  showLogin.value = false
  loginError.value = ''
}

function demoAppleLogin() {
  finishLogin()
}

function submitLogin() {
  if (!/^\S+@\S+\.\S+$/.test(loginEmail.value)) {
    loginError.value = '請輸入有效的 Email 地址。'
    return
  }
  finishLogin()
}

function logout() {
  isLoggedIn.value = false
  localStorage.removeItem('sora-demo-user')
  showUserMenu.value = false
  activeCategory.value = 'all'
}

function handleScroll() {
  isCompactHeader.value = window.scrollY > 32
}

function handleKeydown(event: KeyboardEvent) {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault()
    openSearch()
  }
  if (event.key === 'Escape') {
    closeArticle()
    closeLogin()
    closeSearch()
    showUserMenu.value = false
  }
}

onMounted(() => {
  isLoggedIn.value = localStorage.getItem('sora-demo-user') === 'signed-in'
  handleScroll()
  window.addEventListener('scroll', handleScroll, { passive: true })
  window.addEventListener('keydown', handleKeydown)
})

onBeforeUnmount(() => {
  window.removeEventListener('scroll', handleScroll)
  window.removeEventListener('keydown', handleKeydown)
})
</script>
