const authService = require('../services/authService');
const keyboards = require('../utils/keyboards');
const messages = require('../utils/messages');

async function startOnboarding(ctx, user) {
    ctx.session.user = user;
    ctx.session.onboarding = {
        step: 1,
        genres: [],
        periods: [],
        sceneType: null
    };

    await ctx.reply(
        messages.onboardingStart(),
        keyboards.onboardingGenres()
    );
}

async function handleCallback(ctx) {
    const data = ctx.callbackQuery.data;
    const parts = data.split(':');
    const action = parts[1];
    const value = parts[2];

    if (!ctx.session.onboarding) {
        await ctx.answerCbQuery('❌ Помилка сесії');
        return;
    }

    const step = ctx.session.onboarding.step;

    if (step === 1) {
        // Вибір жанрів
        if (action === 'genre') {
            const genres = ctx.session.onboarding.genres;
            const index = genres.indexOf(value);

            if (index > -1) {
                genres.splice(index, 1);
            } else {
                genres.push(value);
            }

            try {
                await ctx.editMessageReplyMarkup(keyboards.onboardingGenres(genres).reply_markup);
            } catch (error) {
                // Ігноруємо помилку якщо повідомлення не змінилось
                if (!error.description?.includes('message is not modified')) {
                    throw error;
                }
            }
        } else if (action === 'next' && value === 'genres') {
            if (ctx.session.onboarding.genres.length === 0) {
                await ctx.answerCbQuery('❗ Оберіть хоча б один жанр');
                return;
            }

            ctx.session.onboarding.step = 2;
            await ctx.editMessageText(
                messages.onboardingPeriods(),
                keyboards.onboardingPeriods()
            );
        } else if (action === 'skip') {
            await finishOnboarding(ctx);
        }
    } else if (step === 2) {
        // Вибір періодів
        if (action === 'period') {
            const periods = ctx.session.onboarding.periods;
            const index = periods.indexOf(value);

            if (index > -1) {
                periods.splice(index, 1);
            } else {
                periods.push(value);
            }

            try {
                await ctx.editMessageReplyMarkup(keyboards.onboardingPeriods(periods).reply_markup);
            } catch (error) {
                // Ігноруємо помилку якщо повідомлення не змінилось
                if (!error.description?.includes('message is not modified')) {
                    throw error;
                }
            }
        } else if (action === 'next' && value === 'periods') {
            if (ctx.session.onboarding.periods.length === 0) {
                await ctx.answerCbQuery('❗ Оберіть хоча б один період');
                return;
            }

            ctx.session.onboarding.step = 3;
            await ctx.editMessageText(
                messages.onboardingScene(),
                keyboards.onboardingScene()
            );
        } else if (action === 'skip') {
            await finishOnboarding(ctx);
        }
    } else if (step === 3) {
        // Вибір сцени
        if (action === 'scene') {
            ctx.session.onboarding.sceneType = value;
            await finishOnboarding(ctx);
        } else if (action === 'skip') {
            await finishOnboarding(ctx);
        }
    }
}

async function finishOnboarding(ctx) {
    const { genres, periods, sceneType } = ctx.session.onboarding;
    const userId = ctx.session.user.id;

    // Зберігаємо вподобання в БД
    await authService.saveUserPreferences(userId, {
        genres,
        periods,
        sceneType
    });

    // Редагуємо попереднє повідомлення (без клавіатури)
    await ctx.editMessageText(
        messages.onboardingComplete(),
        { parse_mode: 'Markdown' }
    );

    // Відправляємо нове повідомлення з reply keyboard
    await ctx.reply(
        '🎭 Оберіть дію:',
        keyboards.mainMenu()
    );

    delete ctx.session.onboarding;
}

module.exports = {
    startOnboarding,
    handleCallback
};