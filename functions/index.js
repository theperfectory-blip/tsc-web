'use strict';

const { initializeApp } = require('firebase-admin/app');
const { setGlobalOptions } = require('firebase-functions/v2/options');
const { REGION } = require('./lib/config');

initializeApp();
setGlobalOptions({ region: REGION });

exports.notifyStreamToday = require('./lib/notifyStreamToday').notifyStreamToday;
exports.notifyStartupContinuation = require('./lib/notifyStartupContinuation').notifyStartupContinuation;
exports.onMatchWentLive = require('./lib/onMatchWentLive').onMatchWentLive;
