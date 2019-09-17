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
  const { rows } = await db.query('SELECT * FROM messages')
  res.send(rows)
})

app.listen(process.env.PORT, () => {
  console.log(`Shock Forest Bot running on port ${process.env.PORT}`)
})

slimbot.startPolling()
