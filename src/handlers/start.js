const authService = require('../services/authService');
const onboarding = require('./onboarding');
const keyboards = require('../utils/keyboards');
const messages = require('../utils/messages');

async function start(ctx) {
    const telegramId = ctx.from.id;

    // Перевіряємо чи користувач вже авторизований
    const user = await authService.getUserByTelegramId(telegramId);

    if (user) {
        // Користувач авторизований
        await ctx.reply(
            messages.welcome(user.name),
            keyboards.mainMenu()
        );
    } else {
        // Потрібна авторизація
        await ctx.reply(
            messages.welcomeNew(),
            keyboards.authMenu()
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

    // Проста валідація email
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

    // Видаляємо повідомлення з паролем
    try {
        await ctx.deleteMessage(ctx.message.message_id);
    } catch (error) {
        console.error('Cannot delete message:', error);
    }

    // Авторизація
    const result = await authService.authenticateUser(email, password, telegramId);

    if (result.success) {
        ctx.session = {};

        // Перевіряємо чи пройдено онбординг
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
    handleAuthCallback,
    handleEmailInput,
    handlePasswordInput
};