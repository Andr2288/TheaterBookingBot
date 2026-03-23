const showService = require('../services/showService');
const authService = require('../services/authService');
const keyboards = require('../utils/keyboards');
const messages = require('../utils/messages');

async function showAfisha(ctx) {
    const telegramId = ctx.from.id;
    const user = await authService.getUserByTelegramId(telegramId);

    if (!user) {
        await ctx.reply('❌ Спочатку авторизуйтесь: /start');
        return;
    }

    const shows = await showService.getUpcomingShows();

    if (shows.length === 0) {
        await ctx.reply('📅 Наразі немає доступних вистав.');
        return;
    }

    await ctx.reply(
        messages.afishaHeader(shows.length),
        keyboards.afishaList(shows)
    );
}

async function handleShowCallback(ctx) {
    const data = ctx.callbackQuery.data;
    const parts = data.split(':');
    const action = parts[1];
    const showId = parseInt(parts[2]);

    if (action === 'details') {
        const show = await showService.getShowById(showId);

        if (!show) {
            await ctx.answerCbQuery('❌ Виставу не знайдено');
            return;
        }

        await ctx.editMessageText(
            messages.showDetails(show),
            keyboards.showActions(showId)
        );
    } else if (action === 'book') {

        const show = await showService.getShowById(showId);

        ctx.session.booking = {
            showId,
            show,
            step: 'zone'
        };

        const bookedSeats = await showService.getBookedSeats(showId);
        const availability = showService.calculateAvailability(show.scene_type, bookedSeats);

        await ctx.editMessageText(
            messages.selectZone(show),
            keyboards.zoneSelection(show, availability)
        );
    } else if (action === 'back') {
        await showAfisha(ctx);
    }
}

module.exports = {
    showAfisha,
    handleShowCallback
};