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
        {
            parse_mode: 'Markdown',
            ...keyboards.settingsMenu()
        }
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
        await ctx.answerCbQuery('❌ Помилка авторизації');
        return;
    }

    if (action === 'edit') {
        await startPreferencesEdit(ctx, user);
        return;
    }

    if (action === 'clear') {
        await clearPreferences(ctx, user.id);
        return;
    }

    if (!ctx.session.settingsOnboarding) {
        await ctx.answerCbQuery('❌ Помилка сесії. Відкрийте /settings ще раз');
        return;
    }

    const flow = ctx.session.settingsOnboarding;
    const step = flow.step;

    if (step === 1) {
        if (action === 'genre') {
            toggleValue(flow.genres, value);

            try {
                await ctx.editMessageReplyMarkup(
                    keyboards.settingsGenres(flow.genres).reply_markup
                );
            } catch (error) {
                if (!error.description?.includes('message is not modified')) {
                    throw error;
                }
            }
            return;
        }

        if (action === 'next' && value === 'genres') {
            flow.step = 2;

            await ctx.editMessageText(
                messages.onboardingPeriods(),
                {
                    parse_mode: 'Markdown',
                    ...keyboards.settingsPeriods(flow.periods)
                }
            );
            return;
        }

        if (action === 'skip') {
            flow.step = 2;

            await ctx.editMessageText(
                messages.onboardingPeriods(),
                {
                    parse_mode: 'Markdown',
                    ...keyboards.settingsPeriods(flow.periods)
                }
            );
            return;
        }
    }

    if (step === 2) {
        if (action === 'period') {
            toggleValue(flow.periods, value);

            try {
                await ctx.editMessageReplyMarkup(
                    keyboards.settingsPeriods(flow.periods).reply_markup
                );
            } catch (error) {
                if (!error.description?.includes('message is not modified')) {
                    throw error;
                }
            }
            return;
        }

        if ((action === 'next' && value === 'periods') || action === 'skip') {
            flow.step = 3;

            await ctx.editMessageText(
                messages.onboardingScene(),
                {
                    parse_mode: 'Markdown',
                    ...keyboards.settingsScene(flow.sceneType)
                }
            );
            return;
        }
    }

    if (step === 3) {
        if (action === 'scene') {
            flow.sceneType = value;

            await ctx.editMessageText(
                messages.onboardingScene(),
                {
                    parse_mode: 'Markdown',
                    ...keyboards.settingsScene(flow.sceneType)
                }
            );
            return;
        }

        if (action === 'save') {
            await finishPreferencesEdit(ctx, user.id);
            return;
        }

        if (action === 'skip') {
            flow.sceneType = null;
            await finishPreferencesEdit(ctx, user.id);
            return;
        }
    }
}

function toggleValue(arr, value) {
    const index = arr.indexOf(value);

    if (index > -1) {
        arr.splice(index, 1);
    } else {
        arr.push(value);
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
        {
            parse_mode: 'Markdown',
            ...keyboards.settingsGenres(ctx.session.settingsOnboarding.genres)
        }
    );
}

async function finishPreferencesEdit(ctx, userId) {
    const { genres, periods, sceneType } = ctx.session.settingsOnboarding;

    const success = await authService.saveUserPreferences(userId, {
        genres,
        periods,
        sceneType
    });

    delete ctx.session.settingsOnboarding;

    if (!success) {
        await ctx.editMessageText(
            '❌ Не вдалося зберегти налаштування. Спробуйте ще раз пізніше.'
        );
        return;
    }

    await ctx.editMessageText(
        '✅ *Налаштування збережено!*\n\nВаші рекомендації оновлено.',
        { parse_mode: 'Markdown' }
    );

    const updatedPreferences = await authService.getUserPreferences(userId);

    await ctx.reply(
        messages.settingsMenu(updatedPreferences),
        {
            parse_mode: 'Markdown',
            ...keyboards.settingsMenu()
        }
    );
}

async function clearPreferences(ctx, userId) {
    const success = await authService.saveUserPreferences(userId, {
        genres: [],
        periods: [],
        sceneType: null
    });

    delete ctx.session.settingsOnboarding;

    if (!success) {
        await ctx.answerCbQuery('❌ Не вдалося очистити налаштування');
        return;
    }

    await ctx.editMessageText(
        '🗑 *Усі налаштування очищено.*',
        { parse_mode: 'Markdown' }
    );

    const updatedPreferences = await authService.getUserPreferences(userId);

    await ctx.reply(
        messages.settingsMenu(updatedPreferences),
        {
            parse_mode: 'Markdown',
            ...keyboards.settingsMenu()
        }
    );
}

module.exports = {
    showSettings,
    handleCallback
};