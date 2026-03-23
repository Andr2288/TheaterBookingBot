const bookingService = require('../services/bookingService');
const authService = require('../services/authService');
const keyboards = require('../utils/keyboards');
const messages = require('../utils/messages');

async function showMyBookings(ctx) {
    const telegramId = ctx.from.id;
    const user = await authService.getUserByTelegramId(telegramId);

    if (!user) {
        await ctx.reply('❌ Спочатку авторизуйтесь: /start');
        return;
    }

    const bookings = await bookingService.getUserBookings(user.id);

    if (bookings.length === 0) {
        await ctx.reply(
            '📋 У вас поки немає бронювань.\n\n' +
            'Перегляньте афішу: /afisha',
            keyboards.mainMenu()
        );
        return;
    }

    await ctx.reply(
        messages.myBookingsHeader(bookings.length),
        keyboards.mainMenu()
    );

    for (const booking of bookings) {
        await ctx.reply(
            messages.bookingCard(booking),
            keyboards.bookingActions(booking.booking_id, booking.show_date)
        );
    }
}

async function handleCancelCallback(ctx) {
    const data = ctx.callbackQuery.data;
    const parts = data.split(':');
    const bookingId = parseInt(parts[1]);

    const telegramId = ctx.from.id;
    const user = await authService.getUserByTelegramId(telegramId);

    if (!user) {
        await ctx.answerCbQuery('❌ Помилка авторизації');
        return;
    }

    const result = await bookingService.cancelBooking(bookingId, user.id);

    if (result.success) {
        await ctx.editMessageText(
            '✅ Бронювання скасовано.\n\n' +
            '_Перегляньте оновлений список: /my_',
            { parse_mode: 'Markdown' }
        );
    } else {
        await ctx.answerCbQuery(`❌ ${result.error}`);
    }
}

module.exports = {
    showMyBookings,
    handleCancelCallback
};