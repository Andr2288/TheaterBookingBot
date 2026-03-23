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

    if (action === 'edit_preferences') {
        await startPreferencesEdit(ctx, user);
        return;
    }

    if (!ctx.session.settingsOnboarding) {
        await ctx.answerCbQuery('❌ Помилка сесії. Почніть налаштування заново: /settings');
        return;
    }

    const step = ctx.session.settingsOnboarding.step;

    if (step === 1) {
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
        if (action === 'scene') {
            ctx.session.settingsOnboarding.sceneType = value;
            await finishPreferencesEdit(ctx, user.id);
        } else if (action === 'skip') {
            await finishPreferencesEdit(ctx, user.id);
        }
    }
}

async function startPreferencesEdit(ctx, user) {
    const currentPreferences = await authService.getUserPreferences(user.id);

    ctx.session.settingsOnboarding = {
        step: 1,
        genres: [...(currentPreferences.genres || [])],
        periods: [...(currentPreferences.periods || [])],
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

    await authService.saveUserPreferences(userId, {
        genres,
        periods,
        sceneType
    });

    delete ctx.session.settingsOnboarding;

    await ctx.editMessageText(
        '✅ *Налаштування збережено!*\n\n' +
        'Ваші рекомендації оновлено на основі нових вподобань.',
        { parse_mode: 'Markdown' }
    );

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