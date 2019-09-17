const db = require('./db')
const files = require('./files')

async function store (message, edited = false) {
  const chatId = message.chat.id
  const messageId = message.message_id
  const text = message.text || message.caption
  const userId = message.from.id
  const timestamp = new Date((message.edit_date || message.date) * 1000)
  const replyTo = message.reply_to_message && message.reply_to_message.message_id

  const queries = []

  const messageQuery = `INSERT INTO
    messages(id, chat_id, timestamp, edited, reply_to, user_id, text, data)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`
  const messageValues = [messageId, chatId, timestamp, edited, replyTo, userId, text, message]
  queries.push(db.query(messageQuery, messageValues))

  const entities = message.entities || message.caption_entities

  if (entities && entities.length) {
    const hashtags = entities
      .filter((entity) => entity.type === 'hashtag')
      .map((entity) => text.slice(entity.offset, entity.offset + entity.length))

    for (const hashtag of hashtags) {
      const hashtagQuery = `INSERT INTO
        hashtags(hashtag, message_id, chat_id, timestamp)
        VALUES ($1, $2, $3, $4)`
      const hashtagValues = [hashtag, messageId, chatId, timestamp]
      queries.push(db.query(hashtagQuery, hashtagValues))
    }
  }

  const fileQueries = await files.store(message)

  await db.transaction(queries)
}

module.exports = {
  store
}
