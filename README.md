# Shock Forest Bot

Shock Forest Bot is a [Telegram bot](https://core.telegram.org/bots) that collects and archives chat messages from the [Shock Forest Group](https://hethem.nl/en/Chapter-Two/Door-Nicolas-Jaar-Shock-Forest-Group)’s Telegram chat group. These messages are stored in a PostgreSQL database, ordered by hashtag and exposed via an API.

[![Shock Forest Log](https://raw.githubusercontent.com/bertspaan/shock-forest-log/master/screenshot.png)](https://shockforest.group/)

This API is used by the [Shock Forest Log](https://shockforest.group/) display all messages, grouped by hashtag. The source code of the Shock Forest Log is also [available on GitHub](https://github.com/bertspaan/shock-forest-log).

## Usage

Shock Forest Bot expects the following environment variables to be set (or you can place them in a [`.env` file](https://github.com/motdotla/dotenv#dotenv)):

| Environment variable    | Description                  |
|:------------------------|:-----------------------------|
| `PORT`                  | API server port              |
| `TELEGRAM_BOT_TOKEN`    | Telegram bot token           |
| `DATABASE_URL`          | PostgreSQL database URL      |
| `AWS_REGION`            | AWS region for S3            |
| `AWS_ACCESS_KEY_ID`     | AWS access key for S3        |
| `AWS_SECRET_ACCESS_KEY` | AWS secret access key for S3 |
| `AWS_S3_BUCKET`         | AWS S3 bucket name           |
| `CHAT_IDS`              | Comma-separated list of Telegram chat group IDs that will be monitored by the Shock Forest Bot |
| `PRIVATE_HASHTAGS`      | Comma-separated list of Hashtags that will not be stored in the database |

Run locally:

    npm run start

Deploy to Heroku:

    git push heroku master
