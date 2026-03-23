const authService = require('../services/authService');
const keyboards = require('../utils/keyboards');
const messages = require('../utils/messages');

async function showSettings(ctx) {
    const telegramId = ctx.from.id;
    const user = await authService.getUserByTelegramId(telegramId);

    if (!user) {
        await ctx.reply('❌ Спочатку авторизуйтесь: /start');
        return;
    }

    const preferences = await authService.getUserPreferences(user.id);

    await ctx.reply(
        messages.settingsMenu(preferences),
        keyboards.settingsMenu()
    );
}

async function handleCallback(ctx) {
    const data = ctx.callbackQuery.data;
    const parts = data.split(':');
    const action = parts[1];
    const value = parts[2];

    const telegramId = ctx.from.id;
    const user = await authService.getUserByTelegramId(telegramId);

    if (!user) {
        await ctx.answerCbQuery('❌ Помилка авторізації');
        return;
    }

    // Початок редагування налаштувань
    if (action === 'edit_preferences') {
        await startPreferencesEdit(ctx, user);
        return;
    }

    // Обробка онбордингу налаштувань (аналогічно до звичайного онбордингу)
    if (!ctx.session.settingsOnboarding) {
        await ctx.answerCbQuery('❌ Помилка сесії. Почніть налаштування заново: /settings');
        return;
    }

    const step = ctx.session.settingsOnboarding.step;

    if (step === 1) {
        // Вибір жанрів
        if (action === 'genre') {
            const genres = ctx.session.settingsOnboarding.genres;
            const index = genres.indexOf(value);

            if (index > -1) {
                genres.splice(index, 1);
            } else {
                genres.push(value);
            }

            try {
                await ctx.editMessageReplyMarkup(keyboards.settingsGenres(genres).reply_markup);
            } catch (error) {
                // Ігноруємо помилку якщо повідомлення не змінилось
                if (!error.description?.includes('message is not modified')) {
                    throw error;
                }
            }
        } else if (action === 'next' && value === 'genres') {
            if (ctx.session.settingsOnboarding.genres.length === 0) {
                await ctx.answerCbQuery('❗ Оберіть хоча б один жанр');
                return;
            }

            ctx.session.settingsOnboarding.step = 2;
            await ctx.editMessageText(
                messages.onboardingPeriods(),
                keyboards.settingsPeriods(ctx.session.settingsOnboarding.periods)
            );
        } else if (action === 'skip') {
            await finishPreferencesEdit(ctx, user.id);
        }
    } else if (step === 2) {
        // Вибір періодів
        if (action === 'period') {
            const periods = ctx.session.settingsOnboarding.periods;
            const index = periods.indexOf(value);

            if (index > -1) {
                periods.splice(index, 1);
            } else {
                periods.push(value);
            }

            try {
                await ctx.editMessageReplyMarkup(keyboards.settingsPeriods(periods).reply_markup);
            } catch (error) {
                // Ігноруємо помилку якщо повідомлення не змінилось
                if (!error.description?.includes('message is not modified')) {
                    throw error;
                }
            }
        } else if (action === 'next' && value === 'periods') {
            if (ctx.session.settingsOnboarding.periods.length === 0) {
                await ctx.answerCbQuery('❗ Оберіть хоча б один період');
                return;
            }

            ctx.session.settingsOnboarding.step = 3;
            await ctx.editMessageText(
                messages.onboardingScene(),
                keyboards.settingsScene()
            );
        } else if (action === 'skip') {
            await finishPreferencesEdit(ctx, user.id);
        }
    } else if (step === 3) {
        // Вибір сцени
        if (action === 'scene') {
            ctx.session.settingsOnboarding.sceneType = value;
            await finishPreferencesEdit(ctx, user.id);
        } else if (action === 'skip') {
            await finishPreferencesEdit(ctx, user.id);
        }
    }
}

async function startPreferencesEdit(ctx, user) {
    // Отримуємо поточні налаштування
    const currentPreferences = await authService.getUserPreferences(user.id);

    // Ініціалізуємо сесію з поточними налаштуваннями
    ctx.session.settingsOnboarding = {
        step: 1,
        genres: [...(currentPreferences.genres || [])], // Копіюємо масив
        periods: [...(currentPreferences.periods || [])], // Копіюємо масив
        sceneType: currentPreferences.sceneType || null,
        userId: user.id
    };

    await ctx.editMessageText(
        messages.editPreferencesStart(currentPreferences),
        keyboards.settingsGenres(ctx.session.settingsOnboarding.genres)
    );
}

async function finishPreferencesEdit(ctx, userId) {
    const { genres, periods, sceneType } = ctx.session.settingsOnboarding;

    // Зберігаємо оновлені вподобання в БД
    await authService.saveUserPreferences(userId, {
        genres,
        periods,
        sceneType
    });

    // Очищаємо сесію
    delete ctx.session.settingsOnboarding;

    // Редагуємо попереднє повідомлення
    await ctx.editMessageText(
        '✅ *Налаштування збережено!*\n\n' +
        'Ваші рекомендації оновлено на основі нових вподобань.',
        { parse_mode: 'Markdown' }
    );

    // Показуємо оновлені налаштування
    const updatedPreferences = await authService.getUserPreferences(userId);
    await ctx.reply(
        messages.settingsMenu(updatedPreferences),
        keyboards.settingsMenu()
    );
}

module.exports = {
    showSettings,
    handleCallback
};