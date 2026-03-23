const recommendationService = require('../services/recommendationService');
const authService = require('../services/authService');
const keyboards = require('../utils/keyboards');
const messages = require('../utils/messages');

async function showRecommendations(ctx) {
    const telegramId = ctx.from.id;
    const user = await authService.getUserByTelegramId(telegramId);

    if (!user) {
        await ctx.reply('❌ Спочатку авторизуйтесь: /start');
        return;
    }

    const recommendations = await recommendationService.getRecommendations(user.id);

    if (recommendations.personal.length === 0 && recommendations.popular.length === 0) {
        await ctx.reply(
            '🎭 Наразі немає рекомендацій.\n\n' +
            'Забронюйте кілька вистав, щоб ми краще вас зрозуміли!',
            keyboards.mainMenu()
        );
        return;
    }

    if (recommendations.personal.length > 0) {
        await ctx.reply(
            messages.personalRecommendationsHeader(),
            keyboards.mainMenu()
        );

        for (const show of recommendations.personal) {
            await ctx.reply(
                messages.recommendationCard(show, true),
                keyboards.showActions(show.id)
            );
        }
    }

    if (recommendations.popular.length > 0) {
        await ctx.reply(messages.popularRecommendationsHeader());

        for (const show of recommendations.popular) {
            await ctx.reply(
                messages.recommendationCard(show, false),
                keyboards.showActions(show.id)
            );
        }
    }
}

module.exports = {
    showRecommendations
};