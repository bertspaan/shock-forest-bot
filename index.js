require('dotenv').config()

const Slimbot = require('slimbot')
const slimbot = new Slimbot(process.env.TELEGRAM_BOT_TOKEN)

const messages = require('./lib/messages')
const db = require('./lib/db')
const util = require('./lib/util')

const express = require('express')
const cors = require('cors')
const compression = require('compression')

const app = express()

app.use(cors())
app.use(compression())

const CHAT_IDS = (process.env.CHAT_IDS || '')
  .split(',')
  .filter((chatId) => chatId.length)
  .map(Number)

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

function newMessage (message, edited = false) {
  const chatId = message.chat.id
  const valid = checkChatId(chatId)

  if (valid) {
    messages.store(message, edited)
  }
}

slimbot.on('message', async (message) => {
  newMessage(message, false)
})

slimbot.on('edited_message', async (message) => {
  newMessage(message, true)
})

app.get('/', async (req, res) => {
  res.send('Shock Forest Bot')
})

app.get('/messages', async (req, res) => {
  const { rows } = await db.runQuery('SELECT * FROM messages')
  res.send(rows.map((row) => row.data))
})

app.get('/hashtags', async (req, res) => {
  const query = `
  SELECT
    hashtag, jsonb_agg(messages) AS messages
  FROM (
    SELECT hashtag,
      jsonb_build_object(
        'chat_id', h.chat_id,
        'message_id', h.message_id,
        'reply_to', data->'reply_to_message'->'message_id')
      AS messages
    FROM
      hashtags h
    JOIN messages m ON h.chat_id = m.chat_id AND h.message_id = m.message_id
  ) AS a
  GROUP BY
    hashtag`

  const { rows } = await db.runQuery(query)
  res.send(rows)
})

app.get('/urls', async (req, res) => {
  const query = `
    SELECT * FROM (
      SELECT
        chat_id, message_id, text,
        jsonb_array_elements(COALESCE(data->'entities', data->'caption_entities')) AS entity
      FROM messages
    )
    AS entities
    WHERE
      entity->>'type' = 'url' OR
      entity->>'type' = 'text_link'`

  const { rows } = await db.runQuery(query)

  res.send(rows.map((row) => ({
    ...row,
    url: row.entity.type === 'url' ? util.entityFromText(row.text, row.entity) : row.entity.url
  })))
})

app.get('/files', async (req, res) => {
  const { rows } = await db.runQuery('SELECT * FROM files')
  res.send(rows.map((row) => ({
    ...row,
    url: `https://shock-forest-group.s3.eu-central-1.amazonaws.com/${row.path}`
  })))
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

app.listen(process.env.PORT, () => {
  console.log(`Shock Forest Bot running on port ${process.env.PORT}`)
})

slimbot.startPolling()
