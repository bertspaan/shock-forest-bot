require('dotenv').config()

const Slimbot = require('slimbot')
let slimbot
if (process.env.TELEGRAM_BOT_TOKEN) {
  slimbot = new Slimbot(process.env.TELEGRAM_BOT_TOKEN)
}

const messages = require('./lib/messages')
const db = require('./lib/db')
const util = require('./lib/util')
const format = require('./lib/format')

const express = require('express')
const expressWs = require('express-ws')
const cors = require('cors')
const compression = require('compression')

const ews = expressWs(express())
const app = ews.app

app.use(cors())
app.use(compression())

const CHAT_IDS = util.readEnvArray('CHAT_IDS').map(Number)

function checkChatId (chatId) {
  if (CHAT_IDS.length === 0) {
    return true
  }

  if (!CHAT_IDS.includes(chatId)) {
    console.error(`Chat ID ${chatId} not in list of valid chat IDs: ${CHAT_IDS.join(', ')}`)
    return false
  }

  return true
}

function sendWsUpdate () {
  ews.getWss('/ws').clients.forEach((client) => {
    if (client.readyState === 1) {
      client.send(JSON.stringify({
        timestamp: +new Date()
      }))
    }
  })
}

function newMessage (message, edited = false) {
  const chatId = message.chat.id
  const valid = checkChatId(chatId)

  if (valid) {
    messages.store(message, edited)

    try {
      sendWsUpdate()
    } catch (err) {
      console.error('Error sending WebSocket message', err.message)
    }
  }
}

if (slimbot) {
  slimbot.on('message', async (message) => {
    newMessage(message, false)
  })

  slimbot.on('edited_message', async (message) => {
    newMessage(message, true)
  })
}

app.get('/', async (req, res) => {
  res.send('Shock Forest Bot')
})

app.get('/messages', async (req, res) => {
  let hashtags = []
  if (req.query.hashtags) {
    hashtags = (req.query.hashtags || '')
      .split(',')
      .map((hashtag) => `#${hashtag}`)
  }

  const query = `
    WITH files AS (
      SELECT m.chat_id, m.message_id, jsonb_agg(f.*) AS files
      FROM messages m
      JOIN files f ON m.chat_id = f.chat_id AND m.message_id = f.message_id
      GROUP BY m.chat_id, m.message_id
    ),
    hashtag_messages AS (
      SELECT m.chat_id, m.message_id,
        get_first_message(m.message_id) AS first_message_id, hashtag
      FROM messages m
      LEFT OUTER JOIN hashtags h ON h.chat_id = m.chat_id AND h.message_id = m.message_id
    ),
    messages_hashtags AS (
      SELECT first_message_id, array_agg(hm.message_id) AS message_ids,
        array_remove(array_agg(DISTINCT hashtag), NULL) AS hashtags
      FROM hashtag_messages hm
      JOIN messages m
      ON hm.chat_id = m.chat_id AND hm.message_id = m.message_id
      GROUP BY first_message_id
    ),
    message_hashtags AS (
      SELECT DISTINCT first_message_id, unnest(message_ids) AS message_id,
        hashtags FROM messages_hashtags
    ),
    rows_with_hashtags AS (
      SELECT m.data AS message,
        mh.hashtags,
        first_message_id,
        files
      FROM message_hashtags mh
      JOIN messages m ON m.message_id = mh.message_id
      LEFT OUTER JOIN files f ON f.message_id = mh.message_id
      WHERE cardinality(hashtags) > 0 AND
        hashtags @> $1
    )
    SELECT jsonb_agg(r.*) AS messages FROM rows_with_hashtags r
    JOIN messages m ON m.message_id = first_message_id
    GROUP BY first_message_id, date_edited
    ORDER BY date_edited DESC`

  const { rows } = await db.runQuery(query, [hashtags])

  const messages = rows.map((row) => {
    const firstMessages = []
    const messagesById = {}

    row.messages.forEach((message) => {
      const messageId = message.message.message_id
      messagesById[messageId] = {
        message: message.message,
        hashtags: Array.from(new Set(message.hashtags.map(format.hashtag))),
        files: message.files,
        replies: []
      }
    })

    row.messages
      .forEach((message) => {
        const messageId = message.message.message_id
        const replyTo = message.message.reply_to_message && message.message.reply_to_message.message_id

        if (replyTo && messagesById[replyTo]) {
          messagesById[replyTo].replies.push(messagesById[messageId])
        } else {
          firstMessages.push(messageId)
        }
      })

    return firstMessages.map((messageId) => messagesById[messageId])
  }).flat()

  res.send(messages)
})

app.get('/hashtags', async (req, res) => {
  const query = `
    WITH hashtag_messages AS (
      SELECT m.chat_id, m.message_id,
        get_first_message(m.message_id) AS first_message_id, hashtag
      FROM messages m
      LEFT OUTER JOIN hashtags h ON h.chat_id = m.chat_id AND h.message_id = m.message_id
    ),
    messages_hashtags AS (
      SELECT first_message_id, array_agg(DISTINCT hm.message_id) AS message_ids,
        array_remove(array_agg(DISTINCT hashtag), NULL) AS hashtags
      FROM hashtag_messages hm
      JOIN messages m
      ON hm.chat_id = m.chat_id AND hm.message_id = m.message_id
      GROUP BY first_message_id
    ),
    messages_hashtag AS (
      SELECT first_message_id, message_ids,
      unnest(hashtags) AS hashtag
      FROM messages_hashtags
    )
    SELECT hashtag, jsonb_agg(mh.*) AS conversations FROM messages_hashtag mh
    GROUP BY hashtag`

  const { rows } = await db.runQuery(query)

  const hashtags = {}

  rows.forEach((row) => {
    const hashtag = format.hashtag(row.hashtag)
    const messages = row.conversations
      .map((conversation) => conversation.message_ids.map((messageId) => ({
        message_id: messageId,
        first_message_id: conversation.first_message_id
      })))
      .flat()

    if (!hashtags[hashtag]) {
      hashtags[hashtag] = {
        hashtag,
        messages: []
      }
    }

    hashtags[hashtag].messages = [
      ...hashtags[hashtag].messages,
      ...messages
    ]
  })

  res.send(Object.values(hashtags))
})

app.get('/locations', async (req, res) => {
  const query = `
    SELECT
      chat_id, message_id, timestamp,
      CASE WHEN count = 1
      THEN ST_AsGeoJSON(points[1])
      ELSE ST_AsGeoJSON(ST_MakeLine(points))
      END AS geometry
    FROM (
      SELECT
        chat_id, message_id, MAX(timestamp) AS timestamp,
        ARRAY_AGG(point) as points, COUNT(*) AS count FROM locations
      GROUP BY chat_id, message_id
    ) grouped`

  const { rows } = await db.runQuery(query)
  res.send({
    type: 'FeatureCollection',
    features: rows.map((row) => ({
      type: 'Feature',
      properties: {
        messageId: row.message_id,
        chatId: row.chat_id,
        timestamp: row.timestamp
      },
      geometry: JSON.parse(row.geometry)
    }))
  })
})

app.get('/hashtag-mapping', async (req, res) => {
  res.send(format.hashtagMapping)
})

app.ws('/ws', (ws, req) => {
  console.log('New WebSocket connection!')
})

app.listen(process.env.PORT, () => {
  console.log(`Shock Forest Bot running on port ${process.env.PORT}`)
})

if (slimbot) {
  slimbot.startPolling()
}
