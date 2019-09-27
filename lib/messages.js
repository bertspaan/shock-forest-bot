const db = require('./db')
const files = require('./files')
const util = require('./util')

const PIVATE_HASHTAGS = util.readEnvArray('PIVATE_HASHTAGS')

async function store (message, edited = false) {
  const chatId = message.chat.id
  const messageId = message.message_id
  const text = message.text || message.caption
  const userId = message.from.id
  const dateCreated = util.dateFromTimestamp(message.date)
  const dateEdited = util.dateFromTimestamp(message.edit_date || message.date)

  const replyTo = message.reply_to_message && message.reply_to_message.message_id

  const queries = []

  const messageQuery = `INSERT INTO
    messages(chat_id, message_id, date_created, date_edited, edited, reply_to, user_id, text, data)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    ON CONFLICT (chat_id, message_id)
    DO UPDATE SET
    date_edited = EXCLUDED.date_edited,
    edited = TRUE,
    text = EXCLUDED.text,
    data = EXCLUDED.data`

  const messageValues = [chatId, messageId, dateCreated, dateEdited, edited, replyTo, userId, text, message]
  queries.push(db.query(messageQuery, messageValues))

  if (message.location) {
    const longitude = message.location.longitude
    const latitude = message.location.latitude

    const locationQuery = `INSERT INTO
      locations(chat_id, message_id, timestamp, point)
      VALUES ($1, $2, $3, ST_SetSRID(ST_MakePoint($4, $5), 4326))`
    const locationValues = [chatId, messageId, dateEdited, longitude, latitude]

    queries.push(db.query(locationQuery, locationValues))
  }

  const entities = message.entities || message.caption_entities

  if (entities && entities.length) {
    let hashtags = entities
      .filter((entity) => entity.type === 'hashtag')
      .map((entity) => text.slice(entity.offset, entity.offset + entity.length))

    hashtags = [...new Set(hashtags)]

    const includePrivateHashtags = hashtags
      .filter((hashtag) => PIVATE_HASHTAGS.includes(hashtag))
      .length > 0

    if (includePrivateHashtags) {
      return
    }

    // Remove old hashtags for (chatId, messageId):
    const hashtagDeleteQuery = `DELETE FROM hashtags
      WHERE chat_id = $1 AND message_id = $2`
    const hashtagDeleteValues = [chatId, messageId]
    queries.push(db.query(hashtagDeleteQuery, hashtagDeleteValues))

    // Create new hashtags:
    for (const hashtag of hashtags) {
      const hashtagQuery = `INSERT INTO
        hashtags(chat_id, message_id, hashtag)
        VALUES ($1, $2, $3)
        ON CONFLICT (chat_id, message_id, hashtag)
        DO NOTHING`
      const hashtagValues = [chatId, messageId, hashtag]
      queries.push(db.query(hashtagQuery, hashtagValues))
    }
  }

  const fileQueries = await files.store(message)
  await db.transaction(queries.concat(fileQueries))
}

module.exports = {
  store
}
