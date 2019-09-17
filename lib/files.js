const axios = require('axios')
const path = require('path')

const db = require('./db')
const s3 = require('./s3')

const botToken = process.env.TELEGRAM_BOT_TOKEN

async function getFilePath (fileId) {
  const apiUrl = `https://api.telegram.org/bot${botToken}/getFile?file_id=${fileId}`
  try {
    const apiResponse = await axios.get(apiUrl)
    return apiResponse.data.result.file_path
  } catch (err) {
    throw err
  }
}

async function getFileStream (path) {
  const fileUrl = `https://api.telegram.org/file/bot${botToken}/${path}`
  try {
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

function getFileQuery (fileId, messageId, chatId, fileName, fileSize, mimeType, path, thumb = false) {
  const fileQuery = `INSERT INTO
    files(file_id, chat_id, message_id, file_name, file_size, mime_type, thumb, path)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    ON CONFLICT (file_id) DO NOTHING`
  const fileValues = [fileId, chatId, messageId, fileName, fileSize, mimeType, thumb, path]
  return db.query(fileQuery, fileValues)
}

async function uploadFile (fileId, chatId, messageId, fileName, mimeType) {
  const filePath = await getFilePath(fileId)
  const stream = await getFileStream(filePath)
  const extension = path.extname(filePath)

  if (fileName) {
    fileName = `${fileId}_${fileName}`
  } else {
    fileName = `${fileId}${extension}`
  }

  const s3Path = `${chatId}/${messageId}/${fileName}`
  await s3.upload(s3Path, stream, mimeType)
  return s3Path
}

async function store (message) {
  const chatId = message.chat.id
  const messageId = message.message_id

  const queries = []

  console.log(message)

  if (message.photo) {
    const mimeType = 'image/jpeg'
    for (const photo of message.photo) {
      const fileId = photo.file_id
      const fileSize = photo.file_size

      const fileName = `${messageId}_${photo.width}x${photo.height}.jpg`

      const path = await uploadFile(fileId, chatId, messageId, fileName, mimeType)
      const query = getFileQuery(fileId, messageId, chatId, fileName, fileSize, mimeType, path)
      queries.push(query)
    }
  }

  const document = message.document || message.voice || message.video || message.video_note || message.audio
  if (document) {
    const fileId = document.file_id
    const fileSize = document.file_size
    const mimeType = document.mime_type
    const fileName = document.file_name

    const path = await uploadFile(fileId, chatId, messageId, fileName, mimeType)
    const query = getFileQuery(fileId, messageId, chatId, fileName, fileSize, mimeType, path)
    queries.push(query)

    if (document.thumb) {
      const thumbFileId = document.thumb.file_id
      const thumbFileSize = document.thumb.file_size
      const thumbMimeType = 'image/jpeg'
      const thumbFileName = fileName + '_thumb'

      const thumbPath = await uploadFile(thumbFileId, chatId, messageId, thumbFileName, thumbMimeType)
      const thumbQuery = getFileQuery(thumbFileId, messageId, chatId, thumbFileName, thumbFileSize, thumbMimeType, thumbPath, true)
      queries.push(thumbQuery)
    }
  }

  // TODO:
  // animation
  // video_note
  // contact
  // location
  return queries
}

module.exports = {
  store
}
