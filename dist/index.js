
'use strict'

if (process.env.NODE_ENV === 'production') {
  module.exports = require('./dlmm-sdk.cjs.production.min.js')
} else {
  module.exports = require('./dlmm-sdk.cjs.development.js')
}
