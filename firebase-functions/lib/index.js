"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dailyPipeline = exports.health = void 0;
const https_1 = require("firebase-functions/v2/https");
const scheduler_1 = require("firebase-functions/v2/scheduler");
const firebase_functions_1 = require("firebase-functions");
const orchestrate_1 = require("./orchestrate");
exports.health = (0, https_1.onRequest)((req, res) => {
    firebase_functions_1.logger.info('health check', { method: req.method, path: req.path });
    res.status(200).send('ok');
});
exports.dailyPipeline = (0, scheduler_1.onSchedule)({
    schedule: '0 7 * * *',
    timeZone: 'Asia/Seoul'
}, async () => {
    await (0, orchestrate_1.runDailyOrchestration)();
});
//# sourceMappingURL=index.js.map