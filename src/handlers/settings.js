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

    const telegramId = ctx.from.id;
    const user = await authService.getUserByTelegramId(telegramId);

    if (!user) {
        await ctx.answerCbQuery('❌ Помилка авторизації');
        return;
    }

    if (action === 'change_genres') {
        ctx.session.settingsEdit = { field: 'genres', step: 1, genres: [] };
        await ctx.editMessageText(
            messages.editGenres(),
            keyboards.onboardingGenres([])
        );
    } else if (action === 'change_periods') {
        ctx.session.settingsEdit = { field: 'periods', step: 1, periods: [] };
        await ctx.editMessageText(
            messages.editPeriods(),
            keyboards.onboardingPeriods([])
        );
    } else if (action === 'change_scene') {
        ctx.session.settingsEdit = { field: 'scene', step: 1 };
        await ctx.editMessageText(
            messages.editScene(),
            keyboards.onboardingScene()
        );
    } else if (action === 'genre' || action === 'period' || action === 'scene') {
        // Обробка вибору (аналогічно onboarding)
        await handleEditSelection(ctx, user.id);
    } else if (action === 'save') {
        await saveSettings(ctx, user.id);
    } else if (action === 'back') {
        delete ctx.session.settingsEdit;
        await showSettings(ctx);
    }
}

async function handleEditSelection(ctx, userId) {
    const data = ctx.callbackQuery.data;
    const parts = data.split(':');
    const action = parts[1];
    const value = parts[2];

    const edit = ctx.session.settingsEdit;

    if (edit.field === 'genres' && action === 'genre') {
        const index = edit.genres.indexOf(value);
        if (index > -1) {
            edit.genres.splice(index, 1);
        } else {
            edit.genres.push(value);
        }
        await ctx.editMessageReplyMarkup(keyboards.onboardingGenres(edit.genres).reply_markup);
    } else if (edit.field === 'periods' && action === 'period') {
        const index = edit.periods.indexOf(value);
        if (index > -1) {
            edit.periods.splice(index, 1);
        } else {
            edit.periods.push(value);
        }
        await ctx.editMessageReplyMarkup(keyboards.onboardingPeriods(edit.periods).reply_markup);
    } else if (edit.field === 'scene' && action === 'scene') {
        edit.sceneType = value;
        await saveSettings(ctx, userId);
    }
}

async function saveSettings(ctx, userId) {
    const edit = ctx.session.settingsEdit;

    let updateData = {};
    if (edit.field === 'genres') {
        updateData.genres = edit.genres;
    } else if (edit.field === 'periods') {
        updateData.periods = edit.periods;
    } else if (edit.field === 'scene') {
        updateData.sceneType = edit.sceneType;
    }

    await authService.updateUserPreferences(userId, updateData);

    delete ctx.session.settingsEdit;

    await ctx.editMessageText(
        '✅ Налаштування збережено!',
        keyboards.mainMenu()
    );
}

module.exports = {
    showSettings,
    handleCallback
};