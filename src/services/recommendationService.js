const db = require('../config/database');

async function getRecommendations(userId) {
    try {

        const bookedShows = await db.query(
            'SELECT DISTINCT show_id FROM bookings WHERE user_id = ?',
            [userId]
        );

        const bookedIds = bookedShows.map(b => b.show_id);
        const excludeClause = bookedIds.length > 0
            ? `AND id NOT IN (${bookedIds.join(',')})`
            : '';

        const popular = await db.query(`
            SELECT s.*, COUNT(b.id) as booking_count
            FROM shows s
            LEFT JOIN bookings b ON s.id = b.show_id
            WHERE s.date > NOW() ${excludeClause.replace('id', 's.id')}  
            GROUP BY s.id
            ORDER BY booking_count DESC, s.date ASC
            LIMIT 3
        `);

        const preferences = await db.query(`
            SELECT DISTINCT s.genre, s.period_setting, s.scene_type
            FROM bookings b
            JOIN shows s ON b.show_id = s.id
            WHERE b.user_id = ?
            
            UNION
            
            SELECT DISTINCT s.genre, s.period_setting, s.scene_type
            FROM user_interactions ui
            JOIN shows s ON ui.show_id = s.id
            WHERE ui.user_id = ?
        `, [userId, userId]);

        let personal = [];

        if (preferences.length > 0) {
            const genreConditions = [];
            const periodConditions = [];
            const sceneConditions = [];
            const params = [];

            preferences.forEach(pref => {
                if (pref.genre) {
                    genreConditions.push('genre LIKE ?');
                    params.push(`%${pref.genre}%`);
                }
                if (pref.period_setting) {
                    periodConditions.push('period_setting LIKE ?');
                    params.push(`%${pref.period_setting}%`);
                }
                if (pref.scene_type) {
                    sceneConditions.push('scene_type = ?');
                    params.push(pref.scene_type);
                }
            });

            let whereConditions = [];
            if (genreConditions.length > 0) {
                whereConditions.push(`(${genreConditions.join(' OR ')})`);
            }
            if (periodConditions.length > 0) {
                whereConditions.push(`(${periodConditions.join(' OR ')})`);
            }
            if (sceneConditions.length > 0) {
                whereConditions.push(`(${sceneConditions.join(' OR ')})`);
            }

            if (whereConditions.length > 0) {
                const personalShows = await db.query(`
                    SELECT * FROM shows 
                    WHERE date > NOW() ${excludeClause}
                    AND (${whereConditions.join(' OR ')})
                    ORDER BY date ASC
                    LIMIT 3
                `, params);

                personal = personalShows;
            }
        }

        return {
            personal,
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