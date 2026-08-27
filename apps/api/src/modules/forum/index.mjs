import { ForumArticleService } from './application/article-service.mjs'
import { FileArticleRepository } from './infrastructure/file-article-repository.mjs'
import { createForumHttpHandler } from './interface/http.mjs'

const forumArticleRepository = new FileArticleRepository()
const forumArticleService = new ForumArticleService(forumArticleRepository)

export const handleForumRequest = createForumHttpHandler(forumArticleService)
export { FileArticleRepository, ForumArticleService }
