const AWS = require('aws-sdk')

AWS.config.update({region: process.env.AWS_REGION})

const s3 = new AWS.S3({apiVersion: '2006-03-01'})

function upload (path, stream, contentType) {
  const uploadParams = {
    Bucket: process.env.AWS_S3_BUCKET,
    ContentType: contentType,
    Body: stream,
    Key: path
  }

  return s3.upload(uploadParams).promise()
}

module.exports = {
  upload
}
