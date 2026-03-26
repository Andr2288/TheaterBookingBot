const bookingService = require('../services/bookingService');
const showService = require('../services/showService');
const authService = require('../services/authService');
const keyboards = require('../utils/keyboards');
const messages = require('../utils/messages');

function getSelectedSeats(ctx) {
    return ctx.session?.booking?.selectedSeats || [];
}

async function showRowsStep(ctx, showOverride = null) {
    const booking = ctx.session.booking;
    const show = showOverride || booking?.show;

    if (!booking || !show) {
        await ctx.answerCbQuery('❌ Сесію бронювання втрачено');
        return;
    }

    const bookedSeats = await showService.getBookedSeats(show.id);
    const rowsAvailability = showService.getRowsAvailability(show, bookedSeats);

    ctx.session.booking = {
        ...booking,
        show,
        step: 'rows',
        currentRow: null
    };

    await ctx.editMessageText(
        messages.selectRows(show, rowsAvailability, getSelectedSeats(ctx)),
        {
            parse_mode: 'Markdown',
            ...keyboards.rowSelection(show, rowsAvailability, getSelectedSeats(ctx))
        }
    );
}

async function showSeatsStep(ctx, showOverride, row) {
    const booking = ctx.session.booking;
    const show = showOverride || booking?.show;

    if (!booking || !show) {
        await ctx.answerCbQuery('❌ Сесію бронювання втрачено');
        return;
    }

    const bookedSeats = await showService.getBookedSeats(show.id);
    const seats = showService.getSeatsInRow(show, row, bookedSeats, getSelectedSeats(ctx));
    const price = showService.getSeatPrice(show, row);

    ctx.session.booking = {
        ...booking,
        show,
        currentRow: row,
        step: 'seats'
    };

    await ctx.editMessageText(
        messages.selectSeat(show, row, seats, price, getSelectedSeats(ctx)),
        {
            parse_mode: 'Markdown',
            ...keyboards.seatSelection(row, seats, getSelectedSeats(ctx))
        }
    );
}

async function showReviewStep(ctx) {
    const booking = ctx.session.booking;
    if (!booking || !booking.show) {
        await ctx.answerCbQuery('❌ Сесію бронювання втрачено');
        return;
    }

    if (!booking.selectedSeats || booking.selectedSeats.length === 0) {
        await ctx.answerCbQuery('❌ Спочатку оберіть хоча б одне місце');
        return;
    }

    const totalPrice = showService.calculateTotal(booking.show, booking.selectedSeats);

    ctx.session.booking = {
        ...booking,
        step: 'review'
    };

    await ctx.editMessageText(
        messages.reviewBooking(booking.show, booking.selectedSeats, totalPrice),
        {
            parse_mode: 'Markdown',
            ...keyboards.reviewBooking()
        }
    );
}

function sortSeats(seats) {
    return seats.slice().sort((a, b) => a.row - b.row || a.seat - b.seat);
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

    if (!ctx.session.booking) {
        await ctx.answerCbQuery('❌ Помилка сесії');
        return;
    }

    const booking = ctx.session.booking;
    const { showId, show } = booking;

    if (action === 'row') {
        const row = parseInt(parts[2], 10);
        await showSeatsStep(ctx, show, row);
        return;
    }

    if (action === 'add') {
        const row = parseInt(parts[2], 10);
        const seat = parseInt(parts[3], 10);

        if (booking.selectedSeats.length >= 6) {
            await ctx.answerCbQuery('❌ Максимум 6 місць за одне бронювання');
            return;
        }

        const bookedSeats = await showService.getBookedSeats(showId);
        const isBooked = bookedSeats.some((item) => item.seat_row === row && item.seat_number === seat);
        if (isBooked) {
            await ctx.answerCbQuery('❌ Це місце вже зайняте');
            await showSeatsStep(ctx, show, row);
            return;
        }

        const alreadySelected = booking.selectedSeats.some((item) => item.row === row && item.seat === seat);
        if (!alreadySelected) {
            ctx.session.booking.selectedSeats = sortSeats([
                ...booking.selectedSeats,
                { row, seat }
            ]);
        }

        await showSeatsStep(ctx, show, row);
        return;
    }

    if (action === 'remove') {
        const row = parseInt(parts[2], 10);
        const seat = parseInt(parts[3], 10);

        ctx.session.booking.selectedSeats = booking.selectedSeats.filter(
            (item) => !(item.row === row && item.seat === seat)
        );

        await showSeatsStep(ctx, show, row);
        return;
    }

    if (action === 'seat_taken') {
        await ctx.answerCbQuery('❌ Це місце вже зайняте');
        return;
    }

    if (action === 'back_to_rows') {
        await showRowsStep(ctx, show);
        return;
    }

    if (action === 'review') {
        await showReviewStep(ctx);
        return;
    }

    if (action === 'clear') {
        ctx.session.booking.selectedSeats = [];
        if (booking.currentRow) {
            await showSeatsStep(ctx, show, booking.currentRow);
        } else {
            await showRowsStep(ctx, show);
        }
        return;
    }

    if (action === 'confirm') {
        const selectedSeats = booking.selectedSeats || [];
        const result = await bookingService.createBooking(
            user.id,
            showId,
            selectedSeats,
            show
        );

        if (result.success) {
            await ctx.editMessageReplyMarkup({ inline_keyboard: [] });
            await ctx.reply(
                messages.bookingSuccess(show, selectedSeats, result.totalPrice),
                {
                    parse_mode: 'Markdown',
                    ...keyboards.mainMenu()
                }
            );

            delete ctx.session.booking;
            ctx.session.state = null;
        } else {
            await ctx.editMessageText(
                messages.bookingError(result.error),
                {
                    parse_mode: 'Markdown',
                    ...keyboards.reviewBooking()
                }
            );
        }
        return;
    }

    if (action === 'cancel') {
        delete ctx.session.booking;
        ctx.session.state = null;

        await ctx.editMessageText('❌ Бронювання скасовано.');
        await ctx.reply('Оберіть наступну дію:', keyboards.mainMenu());
    }
}

async function handleSeatInput(ctx) {
    await ctx.reply('Тепер місця обираються кнопками, як у схемі на сайті. Вручну вводити ряд і місце не потрібно.');
}

module.exports = {
    handleCallback,
    handleSeatInput,
    showRowsStep
};