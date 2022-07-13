const express = require('express')
require('dotenv').config()
const PORT = process.env.PORT
const MLDScheduledCronJobs = require('./cron/scheduledJobs')

const app = express()

// init middleware
// allows us to get data within bodies of req/res
app.use(express.json({ extended: false }))

app.get('/', (req, res) => res.send('mld cron server running'))

// route used for testing purposes only

if (process.env.ENVIRONMENT === 'test') {
  app.use('/api', require('./routes/products'))
}

MLDScheduledCronJobs()

app.listen(PORT, () => console.log(`Server started on port ${PORT}`))
