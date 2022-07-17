const redis = require('redis')

const _redis = redis.createClient({
  url: process.env.REDIS_URL,
  // socket: {
  //   tls: false,
  //   rejectUnauthorized: false,
  // },
})

_redis.on('error', (err) => {
  console.log('error' + err)
})

_redis.on('connect', () => {
  console.log('Redis connected 🚀😎')
})

_redis.connect()

module.exports = _redis
