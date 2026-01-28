"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.nowKST = nowKST;
exports.toDateKeyKST = toDateKeyKST;
exports.withinHours = withinHours;
const KST_TIMEZONE = 'Asia/Seoul';
function nowKST() {
    return new Date(new Date().toLocaleString('en-US', { timeZone: KST_TIMEZONE }));
}
function toDateKeyKST(input) {
    const date = input
        ? typeof input === 'string'
            ? new Date(input)
            : input
        : new Date();
    const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: KST_TIMEZONE,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
    return formatter.format(date);
}
function withinHours(iso, hours) {
    const target = new Date(iso).getTime();
    if (Number.isNaN(target))
        return false;
    const diffMs = Date.now() - target;
    return diffMs >= 0 && diffMs <= hours * 60 * 60 * 1000;
}
//# sourceMappingURL=time.js.map