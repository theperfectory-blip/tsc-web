'use strict';

const { initializeApp } = require('firebase-admin/app');
const { setGlobalOptions } = require('firebase-functions/v2/options');
const { TASKS_REGION } = require('./lib/config');

initializeApp();
// Default global: el callable y la task-dispatched function (ambos ligados a
// Cloud Tasks) viven en TASKS_REGION. onMatchWentLive pisa esto con
// FIRESTORE_REGION — ver functions/lib/config.js.
setGlobalOptions({ region: TASKS_REGION });

exports.notifyStreamToday = require('./lib/notifyStreamToday').notifyStreamToday;
exports.notifyStartupContinuation = require('./lib/notifyStartupContinuation').notifyStartupContinuation;
exports.onMatchWentLive = require('./lib/onMatchWentLive').onMatchWentLive;
