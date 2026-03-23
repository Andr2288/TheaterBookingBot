const bookingService = require('../services/bookingService');
const showService = require('../services/showService');
const authService = require('../services/authService');
const keyboards = require('../utils/keyboards');
const messages = require('../utils/messages');

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

    if (!ctx.session.booking) {
        await ctx.answerCbQuery('❌ Помилка сесії');
        return;
    }

    const { showId, show } = ctx.session.booking;

    if (action === 'zone') {
        ctx.session.booking.zone = value;
        ctx.session.booking.step = 'seat';
        ctx.session.state = 'awaiting_seat_selection';

        const bookedSeats = await showService.getBookedSeats(showId);
        const availableSeats = showService.getAvailableSeatsInZone(
            show.scene_type,
            value,
            bookedSeats
        );

        await ctx.editMessageText(
            messages.selectSeat(show, value, availableSeats),
            keyboards.backToZones()
        );
    } else if (action === 'back_to_zones') {
        ctx.session.booking.step = 'zone';
        ctx.session.state = null;

        const bookedSeats = await showService.getBookedSeats(showId);
        const availability = showService.calculateAvailability(show.scene_type, bookedSeats);

        await ctx.editMessageText(
            messages.selectZone(show),
            keyboards.zoneSelection(show, availability)
        );
    } else if (action === 'confirm') {

        const { zone, row, seat } = ctx.session.booking;

        const result = await bookingService.createBooking(
            user.id,
            showId,
            parseInt(row),
            parseInt(seat),
            show,
            zone
        );

        if (result.success) {
            await ctx.editMessageText(
                messages.bookingSuccess(show, row, seat, result.price),
                keyboards.mainMenu()
            );

            delete ctx.session.booking;
            ctx.session.state = null;
        } else {
            await ctx.editMessageText(
                messages.bookingError(result.error),
                keyboards.backToZones()
            );
        }
    } else if (action === 'cancel') {
        delete ctx.session.booking;
        ctx.session.state = null;

        await ctx.editMessageText(
            '❌ Бронювання скасовано.',
            keyboards.mainMenu()
        );
    }
}

async function handleSeatInput(ctx) {
    const text = ctx.message.text.trim();

    if (!ctx.session.booking) {
        await ctx.reply('❌ Помилка сесії. Почніть спочатку: /afisha');
        return;
    }

    const { show, zone } = ctx.session.booking;

    const match = text.match(/(\d+)[-\s](\d+)/);

    if (!match) {
        await ctx.reply(
            '❌ Некоректний формат.\n' +
            'Введіть номер ряду та місця, наприклад: *5-10* або *5 10*',
            { parse_mode: 'Markdown' }
        );
        return;
    }

    const row = parseInt(match[1]);
    const seat = parseInt(match[2]);

    const validation = showService.validateSeat(show.scene_type, zone, row, seat);

    if (!validation.valid) {
        await ctx.reply(`❌ ${validation.error}\nСпробуйте ще раз:`);
        return;
    }

    const bookedSeats = await showService.getBookedSeats(ctx.session.booking.showId);
    const isBooked = bookedSeats.some(s => s.seat_row === row && s.seat_number === seat);

    if (isBooked) {
        await ctx.reply(`❌ Місце ${row}-${seat} вже заброньовано.\nОберіть інше:`);
        return;
    }

    ctx.session.booking.row = row;
    ctx.session.booking.seat = seat;
    ctx.session.state = null;

    const price = showService.calculatePrice(show, row);

    await ctx.reply(
        messages.confirmBooking(show, row, seat, price),
        keyboards.confirmBooking()
    );
}

module.exports = {
    handleCallback,
    handleSeatInput
};