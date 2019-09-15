require('dotenv').config()

const Slimbot = require('slimbot')
const slimbot = new Slimbot(process.env.TELEGRAM_BOT_TOKEN)

const db = require('./db')

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

  const text = message.text || message.caption
  const messageId = message.message_id
  const userId = message.from.id
  const timestamp = message.date

  try {
    await db.query('BEGIN')

    const sql = `INSERT INTO messages(id, chat_id, user_id, timestamp, text, data)
      VALUES ($1, $2, $3, $4, $5, $6)`
    const values = [messageId, chatId, userId, timestamp, text, message]
    await db.query(sql, values)

    const entities = message.entities || message.caption_entities

    if (entities && entities.length) {
      const hashtags = entities
        .filter((entity) => entity.type === 'hashtag')
        .map((entity) => text.slice(entity.offset, entity.offset + entity.length))
      // [ { offset: 0, length: 4, type: 'hashtag' } ] }
      console.log('hashtags:', hashtags)
    }

    // CREATE TABLE public.hashtags (
    //   hashtag text,
    //   message_id int REFERENCES public.messages(id) ON DELETE CASCADE
    // );

    await db.query('COMMIT')
  } catch (err) {
    await db.query('ROLLBACK')
    throw err
  }

    console.log('message')
  console.log(message)
})

slimbot.on('edited_message', (message) => {
  console.log('edited_message')
  console.log(message)
})

slimbot.on('callback_query', (query) => {
  console.log('query')
  console.log(query)
})

slimbot.on('inline_query', (inlineQuery) => {
  console.log('inlineQuery')
  console.log(inlineQuery)
})

// // Defining optional parameters
// let optionalParams = {
//   parse_mode: "Markdown",
//   disable_web_page_preview: true,
//   disable_notification: true,
//   reply_to_message_id: 1234,
//   reply_markup: JSON.stringify({
//     inline_keyboard: [[
//       { text: 'Today', callback_data: 'pick_today' },
//       { text: 'Pick a date', callback_data: 'pick_date' }
//     ]]
//   })
// }

app.get('/', async (req, res) => {
  const { rows } = await db.query('SELECT * FROM messages')
  res.json({msg: 'Ja!', rows})
})

app.listen(process.env.PORT, () => {
  console.log(`Shock Forest Bot running on port ${process.env.PORT}`)
})

slimbot.startPolling()
