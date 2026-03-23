const authService = require('../services/authService');
const onboarding = require('./onboarding');
const keyboards = require('../utils/keyboards');
const messages = require('../utils/messages');

async function start(ctx) {
    const telegramId = ctx.from.id;

    const user = await authService.getUserByTelegramId(telegramId);

    if (user) {
        await ctx.reply(
            messages.welcome(user.name),
            keyboards.mainMenu()
        );
    } else {
        await ctx.reply(
            messages.welcomeNew(),
            keyboards.authMenu()
        );
    }
}

async function logout(ctx) {
    const telegramId = ctx.from.id;

    const result = await authService.logoutUser(telegramId);

    ctx.session = {};

    if (result.success) {
        await ctx.reply(
            '👋 *Ви вийшли з акаунту*\n\n' +
            'Щоб увійти знову, використовуйте /start',
            keyboards.authMenu()
        );
    } else {
        await ctx.reply(
            '❌ Помилка виходу з акаунту.\n\n' +
            'Спробуйте ще раз: /logout',
            { parse_mode: 'Markdown' }
        );
    }
}

async function handleAuthCallback(ctx) {
    const action = ctx.callbackQuery.data.split(':')[1];

    if (action === 'login') {
        ctx.session.state = 'awaiting_email';
        await ctx.editMessageText(
            '📧 *Введіть ваш email:*\n\n' +
            'Використовуйте той самий email, що і на сайті театру.',
            { parse_mode: 'Markdown' }
        );
    } else if (action === 'cancel') {
        ctx.session = {};
        await ctx.editMessageText('❌ Авторизацію скасовано.');
    }
}

async function handleEmailInput(ctx) {
    const email = ctx.message.text.trim();

    if (!email.includes('@')) {
        await ctx.reply('❌ Некоректний email. Спробуйте ще раз:');
        return;
    }

    ctx.session.tempEmail = email;
    ctx.session.state = 'awaiting_password';

    await ctx.reply(
        '🔒 *Введіть ваш пароль:*\n\n' +
        '_Пароль не буде збережений і використовується тільки для перевірки._',
        { parse_mode: 'Markdown' }
    );
}

async function handlePasswordInput(ctx) {
    const email = ctx.session.tempEmail;
    const password = ctx.message.text;
    const telegramId = ctx.from.id;

    try {
        await ctx.deleteMessage(ctx.message.message_id);
    } catch (error) {
        console.error('Cannot delete message:', error);
    }

    const result = await authService.authenticateUser(email, password, telegramId);

    if (result.success) {
        ctx.session = {};

        const hasPreferences = await authService.userHasPreferences(result.user.id);

        if (!hasPreferences) {
            await onboarding.startOnboarding(ctx, result.user);
        } else {
            await ctx.reply(
                messages.loginSuccess(result.user.name),
                keyboards.mainMenu()
            );
        }
    } else {
        ctx.session.state = 'awaiting_email';
        await ctx.reply(
            '❌ ' + result.error + '\n\n📧 Введіть email ще раз:',
            { parse_mode: 'Markdown' }
        );
    }
}

module.exports = {
    start,
    logout,
    handleAuthCallback,
    handleEmailInput,
    handlePasswordInput
};