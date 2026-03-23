const { Telegraf, session } = require('telegraf');

// Handlers
const startHandler = require('./handlers/start');
const onboardingHandler = require('./handlers/onboarding');
const afishaHandler = require('./handlers/afisha');
const bookingHandler = require('./handlers/booking');
const myBookingsHandler = require('./handlers/myBookings');
const recommendationsHandler = require('./handlers/recommendations');
const settingsHandler = require('./handlers/settings');

const bot = new Telegraf(process.env.BOT_TOKEN);

// Session middleware для збереження стану користувача
bot.use(session());

// Ініціалізація сесії
bot.use((ctx, next) => {
    if (!ctx.session) {
        ctx.session = {};
    }
    return next();
});

// Команди
bot.command('start', startHandler.start);
bot.command('afisha', afishaHandler.showAfisha);
bot.command('my', myBookingsHandler.showMyBookings);
bot.command('recommendations', recommendationsHandler.showRecommendations);
bot.command('settings', settingsHandler.showSettings);
bot.command('help', (ctx) => {
    ctx.reply(
        '🎭 *Доступні команди:*\n\n' +
        '/start - Головне меню\n' +
        '/afisha - Переглянути афішу\n' +
        '/my - Мої бронювання\n' +
        '/recommendations - Персональні рекомендації\n' +
        '/settings - Налаштування вподобань\n' +
        '/help - Ця довідка',
        { parse_mode: 'Markdown' }
    );
});

// Обробка callback queries (inline buttons)
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
        } else if (data === 'cancel_booking') {
            await myBookingsHandler.handleCancelCallback(ctx);
        } else if (data.startsWith('settings:')) {
            await settingsHandler.handleCallback(ctx);
        }

        await ctx.answerCbQuery();
    } catch (error) {
        console.error('Callback error:', error);
        await ctx.answerCbQuery('❌ Помилка. Спробуйте ще раз.');
    }
});

// Обробка текстових повідомлень
bot.on('text', async (ctx) => {
    const state = ctx.session.state;

    if (state === 'awaiting_email') {
        await startHandler.handleEmailInput(ctx);
    } else if (state === 'awaiting_password') {
        await startHandler.handlePasswordInput(ctx);
    } else if (state === 'awaiting_seat_selection') {
        await bookingHandler.handleSeatInput(ctx);
    } else {
        ctx.reply(
            '❓ Не розумію команду. Використовуйте /help для списку команд.',
            { parse_mode: 'Markdown' }
        );
    }
});

module.exports = bot;