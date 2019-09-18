function dateFromTimestamp (timestamp) {
  return new Date(timestamp * 1000)
}

function entityFromText (text, entity) {
  return text.slice(entity.offset, entity.offset + entity.length)
}

module.exports = {
  dateFromTimestamp,
  entityFromText
}
