<template>
  <div class="sora-page article-detail-page">
    <header class="sora-header">
      <RouterLink class="sora-wordmark" to="/forum" aria-label="Sora 首頁">
        <span class="sora-wordmark-dot" aria-hidden="true"></span>
        <span>Sora</span>
      </RouterLink>
      <nav class="sora-nav" aria-label="主要導覽">
        <RouterLink to="/forum">探索</RouterLink>
        <a href="#article-about">關於 Sora</a>
      </nav>
      <div class="sora-header-actions">
        <RouterLink class="control-plane-link" to="/">管理後台</RouterLink>
        <RouterLink class="detail-back-link" to="/forum">← 回到文章列表</RouterLink>
      </div>
    </header>

    <main class="article-detail-content" aria-live="polite" :aria-busy="loading">
      <div v-if="loading" class="api-state" role="status">載入文章中…</div>
      <div v-else-if="error" class="api-state error-state" role="alert">
        <span class="empty-state-mark">!</span>
        <h1>找不到這篇文章。</h1>
        <p>{{ error }}</p>
        <RouterLink class="detail-primary-link" to="/forum">回到文章列表</RouterLink>
      </div>

      <article v-else-if="article" class="article-detail-card">
        <div class="article-detail-topbar">
          <RouterLink class="detail-back-link" to="/forum">← 回到文章列表</RouterLink>
          <span class="drawer-kicker">SORA / ARTICLE</span>
        </div>
        <div :class="['article-detail-art', 'art-sky', `art-${article.colorClass}`]" aria-hidden="true">
          <span class="art-orb orb-one"></span>
          <span class="art-orb orb-two"></span>
          <span class="art-line line-one"></span>
          <span class="art-line line-two"></span>
          <span class="art-caption">{{ article.category.label.toUpperCase() }}</span>
        </div>
        <div class="article-detail-body">
          <div class="article-label"><span :class="['label-dot', article.colorClass]"></span>{{ article.category.label }} <span>· {{ relativeTime(article.publishedAt) }}</span></div>
          <h1>{{ article.title }}</h1>
          <p class="article-detail-lede">{{ article.excerpt }}</p>
          <div class="article-detail-author">
            <span :class="['author-avatar', 'large', article.author.tone]">{{ article.author.initials }}</span>
            <div>
              <strong>{{ article.author.name }}</strong>
              <span>{{ article.author.bio }}</span>
            </div>
          </div>
          <div class="article-detail-stats">
            <span>{{ reads(article.readCount) }} 閱讀</span>
            <span>{{ article.replyCount }} 回覆</span>
            <span>約 {{ article.readDurationMinutes }} 分鐘</span>
          </div>
          <blockquote>「{{ article.pullQuote }}」<cite>— {{ article.author.name }}</cite></blockquote>
          <div class="article-content">
            <p v-for="paragraph in article.content" :key="paragraph">{{ paragraph }}</p>
          </div>
          <div id="article-about" class="article-detail-footer">
            <span>你正在閱讀 Sora 的公開文章。</span>
            <RouterLink class="detail-primary-link" to="/forum">繼續探索 <span>→</span></RouterLink>
          </div>
        </div>
      </article>
    </main>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { getForumArticle } from './api'
import { formatReadCount, formatRelativeTime } from './format'
import type { ArticleDetail } from './types'

const route = useRoute()
const article = ref<ArticleDetail | null>(null)
const loading = ref(false)
const error = ref('')

async function loadArticle() {
  const slug = String(route.params.slug ?? '')
  loading.value = true
  error.value = ''
  article.value = null
  try {
    const response = await getForumArticle(slug)
    article.value = response.article
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : '請稍後再試。'
  } finally {
    loading.value = false
  }
}

function reads(value: number) {
  return formatReadCount(value)
}

function relativeTime(value: string) {
  return formatRelativeTime(value)
}

watch(() => route.params.slug, () => { void loadArticle() })
onMounted(() => { void loadArticle() })
</script>
