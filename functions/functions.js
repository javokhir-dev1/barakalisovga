import fs from 'fs/promises';

export async function checkOrCreateFolder(folderPath) {
    try {
        await fs.access(folderPath);
    } catch (err) {
        await fs.mkdir(folderPath);
    }
}

export function removeHashtags(text) {
    if (typeof text !== 'string') return text;

    const withoutTags = text.replace(/#[\p{L}\p{N}_-]+/gu, '');

    let cleaned = withoutTags.replace(/\s+/g, ' ').trim();

    if (cleaned.length > 40) {
        cleaned = cleaned.slice(0, 70).trim() + "...";
    }

    return cleaned;
}

export function isLeftTimeGreater(left, right) {
    function parseTime(time) {
        const parts = time.split(':').map(Number);
        if (parts.length === 2) {
            return [0, parts[0], parts[1]];
        } else if (parts.length === 3) {
            return parts;
        } else {
            throw new Error("Noto'g'ri vaqt formati: " + time);
        }
    }

    const [lh, lm, ls] = parseTime(left);
    const [rh, rm, rs] = parseTime(right);

    if (lh > rh) return true;
    if (lh < rh) return false;

    if (lm > rm) return true;
    if (lm < rm) return false;

    return ls > rs;
}