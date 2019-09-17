require('dotenv').config()

const Slimbot = require('slimbot')
const slimbot = new Slimbot(process.env.TELEGRAM_BOT_TOKEN)

const messages = require('./lib/messages')
const db = require('./lib/db')

const express = require('express')
const cors = require('cors')
const app = express()

app.use(cors())

const CHAT_IDS = process.env.CHAT_IDS.split(',').map(Number)

slimbot.on('message', async (message) => {
  const chatId = message.chat.id

  if (!CHAT_IDS.includes(chatId)) {
    console.error(`Chat ID ${chatId} not in list of valid chat IDs: ${CHAT_IDS.join(', ')}`)
    return
  }

  messages.store(message)
})

slimbot.on('edited_message', async (message) => {
  const chatId = message.chat.id

  if (!CHAT_IDS.includes(chatId)) {
    console.error(`Chat ID ${chatId} not in list of valid chat IDs: ${CHAT_IDS.join(', ')}`)
    return
  }

  messages.store(message, true)
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
  SELECT message_id, chat_id, timestamp, ST_AsGeoJSON(point) AS point
  FROM locations`

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
      geometry: JSON.parse(row.point)
    }))
  })
})

app.listen(process.env.PORT, () => {
  console.log(`Shock Forest Bot running on port ${process.env.PORT}`)
})

slimbot.startPolling()
