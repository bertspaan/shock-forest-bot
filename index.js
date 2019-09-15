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
  const timestamp = new Date(message.date * 1000)

  try {
    await db.query('BEGIN')

    const messageQuery = `INSERT INTO messages(id, chat_id, user_id, timestamp, text, data)
      VALUES ($1, $2, $3, $4, $5, $6)`
    const messageValues = [messageId, chatId, userId, timestamp, text, message]
    await db.query(messageQuery, messageValues)

    const entities = message.entities || message.caption_entities

    if (entities && entities.length) {
      const hashtags = entities
        .filter((entity) => entity.type === 'hashtag')
        .map((entity) => text.slice(entity.offset, entity.offset + entity.length))

      for (const hashtag of hashtags) {
        const hashtagQuery = `INSERT INTO hashtags(hashtag, message_id)
          VALUES ($1, $2)`
        const hashtagValues = [hashtag, messageId]
        await db.query(hashtagQuery, hashtagValues)
      }
    }

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
