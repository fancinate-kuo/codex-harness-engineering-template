<template>
  <div class="sora-page">
    <header :class="['sora-header', { 'is-compact': isCompactHeader }]">
      <RouterLink class="sora-wordmark" to="/forum" aria-label="Sora 首頁">
        <span class="sora-wordmark-dot" aria-hidden="true"></span>
        <span>Sora</span>
      </RouterLink>

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
      </div>

      <div v-if="searchOpen" class="search-popover" role="dialog" aria-label="搜尋 Sora" @click.stop>
        <div class="search-input-wrap">
          <svg aria-hidden="true" viewBox="0 0 20 20" fill="none">
            <circle cx="8.5" cy="8.5" r="5.5" stroke="currentColor" stroke-width="1.7" />
            <path d="m13 13 4 4" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" />
          </svg>
          <input
            ref="searchInput"
            v-model="searchInputValue"
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
            </div>
          </section>

          <div class="rail-note">
            <span class="note-orbit" aria-hidden="true"></span>
            <p>今天也留一點時間，<br />給還沒想完的問題。</p>
          </div>
        </aside>

        <section id="discover" class="feed-column" aria-labelledby="feed-title" :aria-busy="loading">
          <div class="feed-toolbar">
            <div>
              <p class="section-index">SORA / DISCOVER</p>
              <h2 id="feed-title">{{ activeCategoryLabel }}</h2>
            </div>
            <div class="feed-meta">
              <span>{{ data?.total ?? 0 }} 篇文章</span>
              <button type="button" aria-label="重新整理文章列表" @click="loadArticles">
                <svg aria-hidden="true" viewBox="0 0 18 18" fill="none"><path d="M14.5 6.5A5.5 5.5 0 1 0 15 10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" /><path d="M14.5 3v3.5H11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" /></svg>
              </button>
            </div>
          </div>

          <div v-if="searchQuery" class="active-search">
            <span>搜尋結果</span>
            <strong>「{{ searchQuery }}」</strong>
            <button type="button" @click="clearSearch">清除</button>
          </div>

          <div v-if="loading" class="api-state" role="status">載入文章中…</div>
          <div v-else-if="error" class="api-state error-state" role="alert">
            <span class="empty-state-mark">!</span>
            <h3>文章暫時無法載入。</h3>
            <p>{{ error }}</p>
            <button type="button" @click="loadArticles">重新載入</button>
          </div>

          <template v-else>
            <article
              v-if="featuredArticle"
              class="featured-article"
              tabindex="0"
              role="button"
              :aria-label="`閱讀精選文章：${featuredArticle.title}`"
              @click="openArticle(featuredArticle.slug)"
              @keydown.enter="openArticle(featuredArticle.slug)"
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
                <div class="article-label"><span :class="['label-dot', featuredArticle.colorClass]"></span>{{ featuredArticle.category.label }} <span>精選</span></div>
                <h3>{{ featuredArticle.title }}</h3>
                <p>{{ featuredArticle.excerpt }}</p>
                <div class="article-footer">
                  <div class="author-block">
                    <span :class="['author-avatar', featuredArticle.author.tone]">{{ featuredArticle.author.initials }}</span>
                    <span>{{ featuredArticle.author.name }}</span>
                  </div>
                  <span>{{ relativeTime(featuredArticle.publishedAt) }} · {{ reads(featuredArticle.readCount) }} 閱讀</span>
                </div>
              </div>
            </article>

            <div v-if="feedArticles.length" class="article-list">
              <article v-for="article in feedArticles" :key="article.slug" class="article-row" tabindex="0" role="button" :aria-label="`閱讀文章：${article.title}`" @click="openArticle(article.slug)" @keydown.enter="openArticle(article.slug)">
                <div class="article-copy">
                  <div class="article-label"><span :class="['label-dot', article.colorClass]"></span>{{ article.category.label }} <span>· {{ relativeTime(article.publishedAt) }}</span></div>
                  <h3>{{ article.title }}</h3>
                  <p>{{ article.excerpt }}</p>
                  <div class="article-footer">
                    <div class="author-block">
                      <span :class="['author-avatar', article.author.tone]">{{ article.author.initials }}</span>
                      <span>{{ article.author.name }}</span>
                    </div>
                    <span>{{ reads(article.readCount) }} 閱讀 · {{ article.replyCount }} 回覆</span>
                  </div>
                </div>
              </article>
            </div>

            <div v-else-if="!featuredArticle" class="empty-state">
              <span class="empty-state-mark">⌁</span>
              <h3>還沒有找到完全相同的答案。</h3>
              <p>試試這些方向，也許下一篇剛好就在那裡。</p>
              <div class="empty-suggestions">
                <button v-for="term in noResultSuggestions" :key="term" type="button" @click="runSearch(term)">{{ term }} <span>↗</span></button>
              </div>
            </div>
          </template>

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
                <button v-for="(article, index) in trendingArticles" :key="article.slug" class="trending-item" type="button" @click="openArticle(article.slug)">
                  <span class="trending-rank">{{ String(index + 1).padStart(2, '0') }}</span>
                  <span class="trending-content">
                    <strong>{{ article.title }}</strong>
                    <span>{{ article.category.label }} · {{ reads(article.readCount) }} 閱讀</span>
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
            <p>閱讀公開文章，不需要登入。把一點時間留給還沒想完的問題。</p>
          </section>
        </aside>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { getForumArticles, isForumCategory } from './api'
import { formatReadCount, formatRelativeTime } from './format'
import type { ArticleSummary, ForumCategoryKey } from './types'

const route = useRoute()
const router = useRouter()
const data = ref<Awaited<ReturnType<typeof getForumArticles>> | null>(null)
const loading = ref(false)
const error = ref('')
const activeCategory = ref<ForumCategoryKey>('all')
const searchQuery = ref('')
const searchInputValue = ref('')
const recentSearches = ref<string[]>(['數位留白', '創作工具'])
const searchOpen = ref(false)
const searchInput = ref<HTMLInputElement | null>(null)
const isCompactHeader = ref(false)
const mobileCategoriesOpen = ref(true)
const mobileTrendingOpen = ref(false)
const suggestedSearches = ['AI 的下一個十年', '留白的力量', '慢生活提案']
const noResultSuggestions = ['AI', '設計', '生活']

const categories = computed(() => data.value?.categories ?? [])
const primaryCategories = computed(() => categories.value.filter(category => category.key !== 'all'))
const activeCategoryLabel = computed(() => categories.value.find(category => category.key === activeCategory.value)?.label ?? '全部文章')
const featuredArticle = computed(() => {
  if (activeCategory.value !== 'all' || searchQuery.value) return null
  return data.value?.articles.find(article => article.featured) ?? null
})
const feedArticles = computed(() => data.value?.articles.filter(article => article.slug !== featuredArticle.value?.slug) ?? [])
const trendingArticles = computed(() => {
  const order = data.value?.trendingSlugs ?? []
  return order
    .map(slug => data.value?.articles.find(article => article.slug === slug))
    .filter((article): article is ArticleSummary => Boolean(article))
})

async function loadArticles() {
  loading.value = true
  error.value = ''
  try {
    data.value = await getForumArticles({ category: activeCategory.value, q: searchQuery.value })
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : '請稍後再試。'
  } finally {
    loading.value = false
  }
}

async function syncFromRoute() {
  const categoryValue = Array.isArray(route.query.category) ? route.query.category[0] : route.query.category
  activeCategory.value = isForumCategory(categoryValue) ? categoryValue : 'all'
  const queryValue = Array.isArray(route.query.q) ? route.query.q[0] : route.query.q
  searchQuery.value = typeof queryValue === 'string' ? queryValue : ''
  searchInputValue.value = searchQuery.value
  await loadArticles()
}

function selectCategory(category: ForumCategoryKey) {
  searchOpen.value = false
  void router.replace({
    path: '/forum',
    query: category === 'all' ? {} : { category },
  })
}

function openSearch() {
  searchOpen.value = true
  void nextTick(() => searchInput.value?.focus())
}

function closeSearch() {
  searchOpen.value = false
}

function runSearch(term: string) {
  const normalized = term.trim()
  if (!normalized) return
  searchOpen.value = false
  if (!recentSearches.value.includes(normalized)) recentSearches.value = [normalized, ...recentSearches.value].slice(0, 3)
  void router.replace({ path: '/forum', query: { q: normalized } })
}

function submitSearch() {
  runSearch(searchInputValue.value)
}

function clearSearch() {
  void router.replace({ path: '/forum', query: activeCategory.value === 'all' ? {} : { category: activeCategory.value } })
}

function openArticle(slug: string) {
  void router.push({ name: 'forum-article', params: { slug } })
}

function reads(value: number) {
  return formatReadCount(value)
}

function relativeTime(value: string) {
  return formatRelativeTime(value)
}

function handleScroll() {
  isCompactHeader.value = window.scrollY > 32
}

function handleKeydown(event: KeyboardEvent) {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault()
    openSearch()
  }
  if (event.key === 'Escape') closeSearch()
}

watch(() => route.query, () => { void syncFromRoute() }, { deep: true, immediate: true })

onMounted(() => {
  handleScroll()
  window.addEventListener('scroll', handleScroll, { passive: true })
  window.addEventListener('keydown', handleKeydown)
})

onBeforeUnmount(() => {
  window.removeEventListener('scroll', handleScroll)
  window.removeEventListener('keydown', handleKeydown)
})
</script>
