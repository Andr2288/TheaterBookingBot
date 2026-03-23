const bcrypt = require('bcryptjs');
const db = require('../config/database');

async function getUserByTelegramId(telegramId) {
    try {
        const [users] = await db.query(
            'SELECT * FROM users WHERE telegram_id = ?',
            [telegramId]
        );
        return users.length > 0 ? users[0] : null;
    } catch (error) {
        console.error('Error getting user by telegram_id:', error);
        return null;
    }
}

async function authenticateUser(email, password, telegramId) {
    try {
        const [users] = await db.query(
            'SELECT * FROM users WHERE email = ?',
            [email]
        );

        if (users.length === 0) {
            return { success: false, error: 'Користувача не знайдено' };
        }

        const user = users[0];

        // Перевірка пароля
        const isValid = await bcrypt.compare(password, user.password);

        if (!isValid) {
            return { success: false, error: 'Невірний пароль' };
        }

        // Оновлюємо telegram_id
        await db.query(
            'UPDATE users SET telegram_id = ? WHERE id = ?',
            [telegramId, user.id]
        );

        return { success: true, user: { ...user, telegram_id: telegramId } };
    } catch (error) {
        console.error('Authentication error:', error);
        return { success: false, error: 'Помилка авторизації' };
    }
}

async function userHasPreferences(userId) {
    try {
        const [preferences] = await db.query(
            'SELECT * FROM user_preferences WHERE user_id = ?',
            [userId]
        );
        return preferences.length > 0;
    } catch (error) {
        console.error('Error checking preferences:', error);
        return false;
    }
}

async function saveUserPreferences(userId, preferences) {
    try {
        const { genres, periods, sceneType } = preferences;

        // Видаляємо старі вподобання
        await db.query('DELETE FROM user_preferences WHERE user_id = ?', [userId]);

        // Зберігаємо жанри
        if (genres && genres.length > 0) {
            for (const genre of genres) {
                await db.query(
                    'INSERT INTO user_preferences (user_id, preference_type, preference_value) VALUES (?, ?, ?)',
                    [userId, 'genre', genre]
                );
            }
        }

        // Зберігаємо періоди
        if (periods && periods.length > 0) {
            for (const period of periods) {
                await db.query(
                    'INSERT INTO user_preferences (user_id, preference_type, preference_value) VALUES (?, ?, ?)',
                    [userId, 'period', period]
                );
            }
        }

        // Зберігаємо тип сцени
        if (sceneType) {
            await db.query(
                'INSERT INTO user_preferences (user_id, preference_type, preference_value) VALUES (?, ?, ?)',
                [userId, 'scene', sceneType]
            );
        }

        return true;
    } catch (error) {
        console.error('Error saving preferences:', error);
        return false;
    }
}

async function getUserPreferences(userId) {
    try {
        const [preferences] = await db.query(
            'SELECT * FROM user_preferences WHERE user_id = ?',
            [userId]
        );

        const result = {
            genres: [],
            periods: [],
            sceneType: null
        };

        preferences.forEach(pref => {
            if (pref.preference_type === 'genre') {
                result.genres.push(pref.preference_value);
            } else if (pref.preference_type === 'period') {
                result.periods.push(pref.preference_value);
            } else if (pref.preference_type === 'scene') {
                result.sceneType = pref.preference_value;
            }
        });

        return result;
    } catch (error) {
        console.error('Error getting preferences:', error);
        return { genres: [], periods: [], sceneType: null };
    }
}

async function updateUserPreferences(userId, updateData) {
    try {
        if (updateData.genres) {
            // Видаляємо старі жанри
            await db.query(
                'DELETE FROM user_preferences WHERE user_id = ? AND preference_type = ?',
                [userId, 'genre']
            );

            // Додаємо нові
            for (const genre of updateData.genres) {
                await db.query(
                    'INSERT INTO user_preferences (user_id, preference_type, preference_value) VALUES (?, ?, ?)',
                    [userId, 'genre', genre]
                );
            }
        }

        if (updateData.periods) {
            await db.query(
                'DELETE FROM user_preferences WHERE user_id = ? AND preference_type = ?',
                [userId, 'period']
            );

            for (const period of updateData.periods) {
                await db.query(
                    'INSERT INTO user_preferences (user_id, preference_type, preference_value) VALUES (?, ?, ?)',
                    [userId, 'period', period]
                );
            }
        }

        if (updateData.sceneType !== undefined) {
            await db.query(
                'DELETE FROM user_preferences WHERE user_id = ? AND preference_type = ?',
                [userId, 'scene']
            );

            if (updateData.sceneType) {
                await db.query(
                    'INSERT INTO user_preferences (user_id, preference_type, preference_value) VALUES (?, ?, ?)',
                    [userId, 'scene', updateData.sceneType]
                );
            }
        }

        return true;
    } catch (error) {
        console.error('Error updating preferences:', error);
        return false;
    }
}

module.exports = {
    getUserByTelegramId,
    authenticateUser,
    userHasPreferences,
    saveUserPreferences,
    getUserPreferences,
    updateUserPreferences
};