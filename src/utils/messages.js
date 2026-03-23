const formatters = require('./formatters');

function welcome(name) {
    return `🎭 *Вітаємо, ${name}!*\n\n` +
        'Театр RESONANCE радий бачити вас.\n\n' +
        'Що бажаєте зробити?';
}

function welcomeNew() {
    return '🎭 *Вітаємо у театрі RESONANCE!*\n\n' +
        'Для початку роботи необхідно авторизуватися.\n\n' +
        'Використовуйте ті самі дані, що і на сайті театру.';
}

function loginSuccess(name) {
    return `✅ *Авторизація успішна!*\n\n` +
        `Вітаємо, ${name}! Тепер ви можете бронювати квитки через бота.\n\n` +
        'Використовуйте команди або кнопки нижче:';
}

function onboardingStart() {
    return '🎯 *Давайте налаштуємо рекомендації!*\n\n' +
        'Відповідайте на кілька питань, щоб ми могли підібрати вистави під ваш смак.\n\n' +
        '📝 *Крок 1/3: Жанри*\n\n' +
        'Які жанри вам подобаються? (можна обрати декілька)';
}

function onboardingPeriods() {
    return '📝 *Крок 2/3: Історичні періоди*\n\n' +
        'Які історичні періоди вас цікавлять?';
}

function onboardingScene() {
    return '📝 *Крок 3/3: Тип сцени*\n\n' +
        'Яку сцену віддаєте перевагу?';
}

function onboardingComplete() {
    return '✅ *Налаштування завершено!*\n\n' +
        'Ми підберемо для вас найкращі вистави на основі ваших вподобань.\n\n' +
        'Перегляньте персональні рекомендації: /recommendations';
}

function afishaHeader(count) {
    return `📅 *Афіша театру RESONANCE*\n\n` +
        `Доступно вистав: ${count}\n\n` +
        'Оберіть виставу для деталей:';
}

function showDetails(show) {
    const date = formatters.formatDate(show.date);
    const sceneType = show.scene_type === 'main' ? 'Основна сцена' : 'Камерна сцена';

    return `🎭 *${show.title}*\n\n` +
        `📅 ${date}\n` +
        `🏛 ${sceneType}\n` +
        `🎪 ${show.genre} • ${show.period_setting}\n\n` +
        `💰 *Ціни:*\n` +
        `🔴 Високі: ${show.price_high} грн\n` +
        `🟡 Середні: ${show.price_mid} грн\n` +
        `🟢 Низькі: ${show.price_low} грн\n\n` +
        (show.description ? `📝 ${show.description}\n\n` : '') +
        'Бажаєте забронювати квитки?';
}

function selectZone(show) {
    return `🎫 *Бронювання квитків*\n\n` +
        `🎭 ${show.title}\n` +
        `📅 ${formatters.formatDate(show.date)}\n\n` +
        '1️⃣ *Оберіть зону:*';
}

function selectSeat(show, zone, availableSeats) {
    const zoneNames = {
        high: 'Високі ціни',
        mid: 'Середні ціни',
        low: 'Низькі ціни'
    };

    let message = `🎫 *Бронювання квитків*\n\n` +
        `🎭 ${show.title}\n` +
        `📍 Зона: ${zoneNames[zone]}\n\n` +
        '2️⃣ *Доступні місця:*\n\n';

    availableSeats.forEach(({ row, seats }) => {
        message += `Ряд ${row}: ${seats}\n`;
    });

    message += '\n📝 Введіть номер ряду та місця (наприклад: *5-10*)';

    return message;
}

function confirmBooking(show, row, seat, price) {
    return `✅ *Підтвердження бронювання*\n\n` +
        `🎭 ${show.title}\n` +
        `📅 ${formatters.formatDate(show.date)}\n` +
        `💺 Ряд ${row}, місце ${seat}\n` +
        `💰 Ціна: ${price} грн\n\n` +
        'Підтвердити бронювання?';
}

function bookingSuccess(show, row, seat, price) {
    return `🎉 *Бронювання успішне!*\n\n` +
        `🎭 ${show.title}\n` +
        `📅 ${formatters.formatDate(show.date)}\n` +
        `💺 Ряд ${row}, місце ${seat}\n` +
        `💰 Ціна: ${price} грн\n\n` +
        '⚠️ *Важливо:*\n' +
        '• Прийдіть за 30 хвилин до початку\n' +
        '• Оплата на касі театру\n' +
        '• При собі мати документ\n\n' +
        'Переглянути всі бронювання: /my';
}

function bookingError(error) {
    return `❌ *Помилка бронювання*\n\n${error}\n\nСпробуйте ще раз.`;
}

function myBookingsHeader(count) {
    return `🎫 *Мої бронювання*\n\n` +
        `Всього: ${count}\n\n`;
}

function bookingCard(booking) {
    const date = formatters.formatDate(booking.show_date);
    const sceneType = booking.scene_type === 'main' ? 'Основна сцена' : 'Камерна сцена';
    const isPast = new Date(booking.show_date) < new Date();

    return `${isPast ? '📜' : '🎫'} *${booking.show_title}*\n\n` +
        `📅 ${date}\n` +
        `🏛 ${sceneType}\n` +
        `💺 Ряд ${booking.seat_row}, місце ${booking.seat_number}\n` +
        `💰 ${booking.price} грн\n\n` +
        (isPast ? '✅ Вистава відбулася' : '⏰ Очікується');
}

function personalRecommendationsHeader() {
    return '⭐ *Персональні рекомендації*\n\n' +
        'На основі ваших вподобань:';
}

function popularRecommendationsHeader() {
    return '🔥 *Популярні вистави*\n\n' +
        'Що бронюють інші відвідувачі:';
}

function recommendationCard(show, isPersonal) {
    const date = formatters.formatDate(show.date);
    const icon = isPersonal ? '⭐' : '🔥';

    return `${icon} *${show.title}*\n\n` +
        `📅 ${date}\n` +
        `🎪 ${show.genre} • ${show.period_setting}\n` +
        `💰 від ${show.price_low} грн`;
}

function settingsMenu(preferences) {
    let message = '⚙️ *Налаштування*\n\n';

    if (preferences.genres.length > 0) {
        message += `🎭 *Жанри:* ${preferences.genres.join(', ')}\n`;
    }

    if (preferences.periods.length > 0) {
        message += `⏰ *Періоди:* ${preferences.periods.join(', ')}\n`;
    }

    if (preferences.sceneType) {
        const scene = preferences.sceneType === 'main' ? 'Основна сцена' :
                      preferences.sceneType === 'chamber' ? 'Камерна сцена' : 'Без різниці';
        message += `🎪 *Сцена:* ${scene}\n`;
    }

    message += '\n_Що бажаєте змінити?_';

    return message;
}

function editGenres() {
    return '🎭 *Оберіть жанри:*\n\n(можна вибрати декілька)';
}

function editPeriods() {
    return '⏰ *Оберіть періоди:*\n\n(можна вибрати декілька)';
}

function editScene() {
    return '🎪 *Оберіть сцену:*';
}

function reminderMessage(booking) {
    const date = formatters.formatDate(booking.show_date);

    return `🔔 *НАГАДУВАННЯ*\n\n` +
        `Через 24 години у вас вистава!\n\n` +
        `🎭 ${booking.show_title}\n` +
        `📅 ${date}\n` +
        `💺 Ряд ${booking.seat_row}, місце ${booking.seat_number}\n` +
        `💰 ${booking.price} грн\n\n` +
        `⚠️ *Не забудьте:*\n` +
        `• Прийти за 30 хвилин\n` +
        `• Взяти документ\n` +
        `• Оплатити на касі`;
}

module.exports = {
    welcome,
    welcomeNew,
    loginSuccess,
    onboardingStart,
    onboardingPeriods,
    onboardingScene,
    onboardingComplete,
    afishaHeader,
    showDetails,
    selectZone,
    selectSeat,
    confirmBooking,
    bookingSuccess,
    bookingError,
    myBookingsHeader,
    bookingCard,
    personalRecommendationsHeader,
    popularRecommendationsHeader,
    recommendationCard,
    settingsMenu,
    editGenres,
    editPeriods,
    editScene,
    reminderMessage
};