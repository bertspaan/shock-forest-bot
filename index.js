require('dotenv').config()

const Slimbot = require('slimbot')
const slimbot = new Slimbot(process.env.TELEGRAM_BOT_TOKEN)

const messages = require('./lib/messages')
const db = require('./lib/db')

const express = require('express')
const cors = require('cors')
const app = express()

app.use(cors())

const CHAT_IDS = (process.env.CHAT_IDS || []).split(',').map(Number)

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
  res.send(rows)
})

app.get('/hashtags', async (req, res) => {
  const { rows } = await db.runQuery('SELECT * FROM hashtags')
  res.send(rows)
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
