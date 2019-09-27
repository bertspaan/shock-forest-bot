function dateFromTimestamp (timestamp) {
  return new Date(timestamp * 1000)
}

function entityFromText (text, entity) {
  return text.slice(entity.offset, entity.offset + entity.length)
}

function readEnvArray (env) {
  return (process.env[env] || '')
    .split(',')
    .filter((item) => item.length)
    .map((item) => item.trim())
}

module.exports = {
  dateFromTimestamp,
  entityFromText,
  readEnvArray
}
