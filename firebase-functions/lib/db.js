"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.collections = exports.db = void 0;
exports.sourcesByTopicRecent = sourcesByTopicRecent;
exports.articleDocId = articleDocId;
exports.articleDocRef = articleDocRef;
exports.jobsRef = jobsRef;
const app_1 = require("firebase-admin/app");
const firestore_1 = require("firebase-admin/firestore");
const app = (0, app_1.initializeApp)({
    credential: (0, app_1.applicationDefault)()
});
exports.db = (0, firestore_1.getFirestore)(app);
exports.collections = {
    sources: exports.db.collection('sources'),
    articles: exports.db.collection('articles'),
    jobs: exports.db.collection('jobs')
};
function sourcesByTopicRecent(topic, sinceIso) {
    return exports.collections.sources
        .where('topic', '==', topic)
        .where('publishedAt', '>=', sinceIso)
        .orderBy('publishedAt', 'desc');
}
function articleDocId(topic, dateKey) {
    return `${topic}_${dateKey}`;
}
function articleDocRef(topic, dateKey) {
    return exports.collections.articles.doc(articleDocId(topic, dateKey));
}
function jobsRef() {
    return exports.collections.jobs;
}
//# sourceMappingURL=db.js.map