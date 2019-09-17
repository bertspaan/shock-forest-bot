const axios = require('axios')

const db = require('./db')
const s3 = require('./s3')
const util = require('./util')

const botToken = process.env.TELEGRAM_BOT_TOKEN

async function getFileStream (fileId) {
  const apiUrl = `https://api.telegram.org/bot${botToken}/getFile?file_id=${fileId}`
  try {
    const apiResponse = await axios.get(apiUrl)
    const path = apiResponse.data.result.file_path

    const fileUrl = `https://api.telegram.org/file/bot${botToken}/${path}`

    console.log(`Ready to download file from ${fileUrl}`)

    const fileResponse = await axios({
      method: 'get',
      url: fileUrl,
      responseType: 'stream'
    })

    return fileResponse.data
  } catch (err) {
    throw err
  }
}

function getFileQuery (fileId, messageId, chatId, timestamp, fileName, fileSize, mimeType, path) {
  const fileQuery = `INSERT INTO
    files(file_id, chat_id, message_id, file_name, file_size, mime_type, path)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    ON CONFLICT (file_id) DO NOTHING`
  const fileValues = [fileId, chatId, messageId, fileName, fileSize, mimeType, path]
  return db.query(fileQuery, fileValues)
}

async function uploadFile (fileId, chatId, messageId, fileName, mimeType) {
  const stream = await getFileStream(fileId)
  const path = `${chatId}/${messageId}/${fileId}_${fileName}`
  await s3.upload(path, stream, mimeType)
  return path
}

async function store (message) {
  const chatId = message.chat.id
  const messageId = message.message_id
  const timestamp = util.timestampFromMessage(message)

  const queries = []

  console.log(message)

  if (message.audio) {

  }

  if (message.photo) {
    const mimeType = 'image/jpeg'
    for (const photo of message.photo) {
      const fileId = photo.file_id
      const fileSize = photo.file_size

      const fileName = `${messageId}_${photo.width}x${photo.height}.jpg`

      const path = await uploadFile(fileId, chatId, messageId, fileName, mimeType)
      const query = getFileQuery(fileId, messageId, chatId, timestamp, fileName, fileSize, mimeType, path)
      queries.push(query)
    }
  }

  if (message.document) {
    const fileId = message.document.file_id
    const fileSize = message.document.file_size
    const mimeType = message.document.mime_type
    const fileName = message.document.file_name

    const path = await uploadFile(fileId, chatId, messageId, fileName, mimeType)
    const query = getFileQuery(fileId, messageId, chatId, timestamp, fileName, fileSize, mimeType, path)
    queries.push(query)

    // "document": {
    //   "thumb": {
    //     "width": 240,
    //     "height": 320,
    //     "file_id": "AAQEAAMWBwACItUAAVBFa0S17fleUIMUnxsABAEAB20AA_EaAAIWBA",
    //     "file_size": 6004
    //   },
    //   "file_id": "BQADBAADFgcAAiLVAAFQRWtEte35XlAWBA",
    //   "file_name": "file_0.jpg",
    //   "file_size": 40385,
    //   "mime_type": "image/jpeg"
    // },
  }

  if (message.voice) {
    // "voice": {
    //   "file_id": "AwADBAADFwcAAiLVAAFQshid13-1KvMWBA",
    //   "duration": 3,
    //   "file_size": 11560,
    //   "mime_type": "audio/ogg"
    // },
  }

  if (message.video) {

  }

  // animation
  // video_note
  // contact
  // location
  return queries
}

module.exports = {
  store
}
