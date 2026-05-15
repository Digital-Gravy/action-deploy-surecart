"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.matchesGlob = matchesGlob;
function matchesGlob(name, pattern) {
    if (!pattern)
        return true;
    const regex = globToRegex(pattern);
    return regex.test(name);
}
function globToRegex(pattern) {
    let regexStr = '^';
    for (let i = 0; i < pattern.length; i++) {
        const ch = pattern[i];
        if (ch === '*') {
            regexStr += '.*';
        }
        else if (ch === '?') {
            regexStr += '.';
        }
        else if (ch === '[') {
            const closeIdx = pattern.indexOf(']', i);
            if (closeIdx === -1) {
                regexStr += '\\[';
            }
            else {
                regexStr += pattern.slice(i, closeIdx + 1);
                i = closeIdx;
            }
        }
        else if ('.+^$()|\\{}'.includes(ch)) {
            regexStr += '\\' + ch;
        }
        else {
            regexStr += ch;
        }
    }
    regexStr += '$';
    return new RegExp(regexStr);
}
