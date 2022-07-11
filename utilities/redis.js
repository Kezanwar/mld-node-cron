const redis = require('redis')

const _redis = redis.createClient(process.env.REDIS_PORT)
_redis.connect()

module.exports = _redis
