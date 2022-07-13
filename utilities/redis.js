const redis = require('redis')

const _redis = redis.createClient({
  url: process.env.REDIS_URL,
  socket: {
    tls: false,
    rejectUnauthorized: false,
  },
})
// const _redis = redis.createClient(process.env.REDIS_PORT)

_redis.on('error', (err) => {
  console.log('error' + err)
})
_redis.connect()

module.exports = _redis
