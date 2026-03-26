const db = require('../config/database');
const authService = require('./authService');

function uniqueById(items) {
    const seen = new Set();
    return items.filter((item) => {
        if (seen.has(item.id)) return false;
        seen.add(item.id);
        return true;
    });
}

async function getBookedShowIds(userId) {
    const bookedShows = await db.query(
        'SELECT DISTINCT show_id FROM bookings WHERE user_id = ?',
        [userId]
    );

    return bookedShows.map((item) => Number(item.show_id));
}

function buildExcludeClause(excludedIds = []) {
    if (!excludedIds.length) {
        return { sql: '', params: [] };
    }

    const placeholders = excludedIds.map(() => '?').join(', ');
    return {
        sql: ` AND s.id NOT IN (${placeholders}) `,
        params: excludedIds
    };
}

async function getPersonalBySavedPreferences(userId, excludedIds = []) {
    const preferences = await authService.getUserPreferences(userId);

    const genres = preferences.genres || [];
    const periods = preferences.periods || [];
    const sceneType = preferences.sceneType;

    const conditions = ['s.date > NOW()'];
    const params = [];

    if (genres.length > 0) {
        const placeholders = genres.map(() => '?').join(', ');
        conditions.push(`s.genre IN (${placeholders})`);
        params.push(...genres);
    }

    if (periods.length > 0) {
        const placeholders = periods.map(() => '?').join(', ');
        conditions.push(`s.period_setting IN (${placeholders})`);
        params.push(...periods);
    }

    if (sceneType && sceneType !== 'any') {
        conditions.push('s.scene_type = ?');
        params.push(sceneType);
    }

    const hasRealPreferences =
        genres.length > 0 || periods.length > 0 || (sceneType && sceneType !== 'any');

    if (!hasRealPreferences) {
        return [];
    }

    const exclude = buildExcludeClause(excludedIds);

    const rows = await db.query(
        `
        SELECT
            s.*,
            COALESCE(COUNT(b.id), 0) AS booking_count
        FROM shows s
        LEFT JOIN bookings b ON s.id = b.show_id
        WHERE ${conditions.join(' AND ')}
        ${exclude.sql}
        GROUP BY s.id
        ORDER BY
            booking_count DESC,
            s.date ASC
        LIMIT 6
        `,
        [...params, ...exclude.params]
    );

    return rows;
}

async function getPreferenceSignalsFromHistory(userId) {
    return db.query(
        `
        SELECT
            s.genre,
            s.period_setting,
            s.scene_type,
            COUNT(*) AS weight
        FROM (
            SELECT b.show_id
            FROM bookings b
            WHERE b.user_id = ?

            UNION ALL

            SELECT ui.show_id
            FROM user_interactions ui
            WHERE ui.user_id = ?
        ) x
        JOIN shows s ON s.id = x.show_id
        GROUP BY s.genre, s.period_setting, s.scene_type
        ORDER BY weight DESC
        `,
        [userId, userId]
    );
}

async function getPersonalByHistory(userId, excludedIds = []) {
    const signals = await getPreferenceSignalsFromHistory(userId);

    if (!signals.length) {
        return [];
    }

    const genres = [...new Set(signals.map((item) => item.genre).filter(Boolean))].slice(0, 4);
    const periods = [...new Set(signals.map((item) => item.period_setting).filter(Boolean))].slice(0, 4);
    const scenes = [...new Set(signals.map((item) => item.scene_type).filter(Boolean))].slice(0, 2);

    const scoreParts = [];
    const params = [];
    const orParts = [];

    if (genres.length) {
        const placeholders = genres.map(() => '?').join(', ');
        scoreParts.push(`CASE WHEN s.genre IN (${placeholders}) THEN 3 ELSE 0 END`);
        orParts.push(`s.genre IN (${placeholders})`);
        params.push(...genres);
        params.push(...genres);
    }

    if (periods.length) {
        const placeholders = periods.map(() => '?').join(', ');
        scoreParts.push(`CASE WHEN s.period_setting IN (${placeholders}) THEN 2 ELSE 0 END`);
        orParts.push(`s.period_setting IN (${placeholders})`);
        params.push(...periods);
        params.push(...periods);
    }

    if (scenes.length) {
        const placeholders = scenes.map(() => '?').join(', ');
        scoreParts.push(`CASE WHEN s.scene_type IN (${placeholders}) THEN 1 ELSE 0 END`);
        orParts.push(`s.scene_type IN (${placeholders})`);
        params.push(...scenes);
        params.push(...scenes);
    }

    if (!scoreParts.length || !orParts.length) {
        return [];
    }

    const exclude = buildExcludeClause(excludedIds);

    const rows = await db.query(
        `
        SELECT
            s.*,
            (${scoreParts.join(' + ')}) AS match_score,
            COALESCE(COUNT(b.id), 0) AS booking_count
        FROM shows s
        LEFT JOIN bookings b ON s.id = b.show_id
        WHERE s.date > NOW()
          ${exclude.sql}
          AND (${orParts.join(' OR ')})
        GROUP BY s.id
        HAVING match_score > 0
        ORDER BY
            match_score DESC,
            booking_count DESC,
            s.date ASC
        LIMIT 6
        `,
        [...params, ...exclude.params]
    );

    return rows;
}

async function getPopularRecommendations(excludedIds = [], limit = 3) {
    const exclude = buildExcludeClause(excludedIds);

    return db.query(
        `
        SELECT
            s.*,
            COUNT(b.id) AS booking_count
        FROM shows s
        LEFT JOIN bookings b ON s.id = b.show_id
        WHERE s.date > NOW()
        ${exclude.sql}
        GROUP BY s.id
        ORDER BY
            booking_count DESC,
            s.date ASC
        LIMIT ${Number(limit)}
        `,
        exclude.params
    );
}

async function getRecommendations(userId) {
    try {
        const bookedIds = await getBookedShowIds(userId);

        let personal = await getPersonalBySavedPreferences(userId, bookedIds);
        personal = uniqueById(personal);

        if (personal.length === 0) {
            personal = await getPersonalByHistory(userId, bookedIds);
            personal = uniqueById(personal);
        }

        const excludedForPopular = [
            ...bookedIds,
            ...personal.map((item) => Number(item.id))
        ];

        let popular = await getPopularRecommendations(excludedForPopular, 3);
        popular = uniqueById(popular);

        return {
            personal: personal.slice(0, 3),
            popular
        };
    } catch (error) {
        console.error('Recommendations error:', error);
        return { personal: [], popular: [] };
    }
}

module.exports = {
    getRecommendations
};