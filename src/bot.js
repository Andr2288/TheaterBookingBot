const { Telegraf, session } = require('telegraf');

const startHandler = require('./handlers/start');
const onboardingHandler = require('./handlers/onboarding');
const afishaHandler = require('./handlers/afisha');
const bookingHandler = require('./handlers/booking');
const myBookingsHandler = require('./handlers/myBookings');
const recommendationsHandler = require('./handlers/recommendations');
const settingsHandler = require('./handlers/settings');

const bot = new Telegraf(process.env.BOT_TOKEN);

bot.use(session());

bot.use((ctx, next) => {
    if (!ctx.session) {
        ctx.session = {};
    }
    return next();
});

bot.command('start', startHandler.start);
bot.command('afisha', afishaHandler.showAfisha);
bot.command('my', myBookingsHandler.showMyBookings);
bot.command('recommendations', recommendationsHandler.showRecommendations);
bot.command('settings', settingsHandler.showSettings);
bot.command('logout', startHandler.logout);
bot.command('help', (ctx) => {
    ctx.reply(
        '🎭 *Доступні команди:*\n\n' +
        '/start - Головне меню\n' +
        '/afisha - Переглянути афішу\n' +
        '/my - Мої бронювання\n' +
        '/recommendations - Персональні рекомендації\n' +
        '/settings - Налаштування вподобань\n' +
        '/logout - Вийти з акаунту\n' +
        '/help - Ця довідка',
        { parse_mode: 'Markdown' }
    );
});

bot.on('callback_query', async (ctx) => {
    const data = ctx.callbackQuery.data;

    try {
        if (data.startsWith('auth:')) {
            await startHandler.handleAuthCallback(ctx);
        } else if (data.startsWith('onboarding:')) {
            await onboardingHandler.handleCallback(ctx);
        } else if (data.startsWith('show:')) {
            await afishaHandler.handleShowCallback(ctx);
        } else if (data.startsWith('booking:')) {
            await bookingHandler.handleCallback(ctx);
        } else if (data.startsWith('cancel_booking:')) {
            await myBookingsHandler.handleCancelCallback(ctx);
        } else if (data.startsWith('settings:')) {
            await settingsHandler.handleCallback(ctx);
        }

        await ctx.answerCbQuery();
    } catch (error) {
        console.error('Callback error:', error);
        try {
            await ctx.answerCbQuery('❌ Помилка. Спробуйте ще раз.');
        } catch (_) {}
    }
});

bot.on('text', async (ctx) => {
    const state = ctx.session.state;
    const text = ctx.message.text.trim();

    if (state === 'awaiting_email') {
        await startHandler.handleEmailInput(ctx);
        return;
    }

    if (state === 'awaiting_password') {
        await startHandler.handlePasswordInput(ctx);
        return;
    }

    if (state === 'awaiting_seat_selection') {
        await bookingHandler.handleSeatInput(ctx);
        return;
    }

    switch (text) {
        case '📅 Афіша':
            await afishaHandler.showAfisha(ctx);
            break;
        case '🎫 Мої бронювання':
            await myBookingsHandler.showMyBookings(ctx);
            break;
        case '⭐ Рекомендації':
            await recommendationsHandler.showRecommendations(ctx);
            break;
        case '⚙️ Налаштування':
            await settingsHandler.showSettings(ctx);
            break;
        case '🚪 Вийти з акаунту':
            await startHandler.logout(ctx);
            break;
        default:
            await ctx.reply(
                '❓ Не розумію команду. Використовуйте /help для списку команд.',
                { parse_mode: 'Markdown' }
            );
    }
});

module.exports = bot;