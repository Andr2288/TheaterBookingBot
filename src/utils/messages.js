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
        'Перегляньте афішу з пропозиціями: /afisha';
}

function afishaHeader(count) {
    return `📅 *Афіша театру RESONANCE*\n\n` +
        `Доступно вистав: ${count}\n\n` +
        'Оберіть виставу для деталей:';
}

function showDetails(show) {
    const date = formatters.formatDate(show.date);
    const sceneType = show.scene_type === 'main' ? 'Основна сцена' : 'Камерна сцена';
    const pricingHint = show.scene_type === 'main'
        ? '1–3 ряд — висока ціна, 4–7 — середня, 8–10 — нижча'
        : '1 ряд — висока ціна, 2–3 — середня, 4 — нижча';

    return `🎭 *${show.title}*\n\n` +
        `📅 ${date}\n` +
        `🏛 ${sceneType}\n` +
        `🎪 ${show.genre} • ${show.period_setting}\n\n` +
        `💰 *Ціни:*\n` +
        `• ${show.price_high} грн\n` +
        `• ${show.price_mid} грн\n` +
        `• ${show.price_low} грн\n` +
        `_${pricingHint}_\n\n` +
        (show.description ? `📝 ${show.description}\n\n` : '') +
        'Бажаєте забронювати квитки?';
}

function formatSelectedSeats(selectedSeats) {
    if (!selectedSeats || selectedSeats.length === 0) {
        return 'Ще нічого не обрано';
    }

    return selectedSeats
        .slice()
        .sort((a, b) => a.row - b.row || a.seat - b.seat)
        .map((seat) => `Ряд ${seat.row}, місце ${seat.seat}`)
        .join('; ');
}

function selectRows(show, rowsAvailability, selectedSeats = []) {
    const sceneName = show.scene_type === 'main' ? 'Основна сцена' : 'Камерна сцена';
    const selectedCount = selectedSeats.length;

    let message = `🎫 *Бронювання квитків*\n\n` +
        `🎭 ${show.title}\n` +
        `📅 ${formatters.formatDate(show.date)}\n` +
        `🏛 ${sceneName}\n\n` +
        `Оберіть ряд. Логіка цін така сама, як на сайті.\n\n` +
        `Обрано місць: *${selectedCount}/6*\n` +
        `Місця: ${formatSelectedSeats(selectedSeats)}\n\n` +
        `*Доступні ряди:*\n`;

    rowsAvailability.forEach((rowInfo) => {
        message += `• Ряд ${rowInfo.row} — ${rowInfo.price} грн — ${rowInfo.available}/${rowInfo.total} вільно\n`;
    });

    return message;
}

function selectSeat(show, row, seats, price, selectedSeats = []) {
    const freeSeats = seats
        .filter((seatItem) => !seatItem.booked)
        .map((seatItem) => seatItem.selected ? `✅${seatItem.seat}` : `${seatItem.seat}`)
        .join(', ');

    return `🎫 *Бронювання квитків*\n\n` +
        `🎭 ${show.title}\n` +
        `📅 ${formatters.formatDate(show.date)}\n` +
        `💺 Ряд ${row}\n` +
        `💰 Ціна за місце в цьому ряду: ${price} грн\n\n` +
        `Обрано місць: *${selectedSeats.length}/6*\n` +
        `Місця: ${formatSelectedSeats(selectedSeats)}\n\n` +
        'Натискайте місця нижче.\n' +
        '• число — вільне\n' +
        '• ✅число — вже обране вами\n' +
        '• ❌число — зайняте\n\n' +
        `Вільні місця в ряду: ${freeSeats || 'немає'}`;
}

function reviewBooking(show, selectedSeats, totalPrice) {
    return `✅ *Підтвердження бронювання*\n\n` +
        `🎭 ${show.title}\n` +
        `📅 ${formatters.formatDate(show.date)}\n\n` +
        `Обрані місця (${selectedSeats.length}):\n` +
        `${selectedSeats
            .slice()
            .sort((a, b) => a.row - b.row || a.seat - b.seat)
            .map((seat) => `• Ряд ${seat.row}, місце ${seat.seat} — ${show.scene_type === 'chamber'
                ? (seat.row === 1 ? show.price_high : seat.row <= 3 ? show.price_mid : show.price_low)
                : (seat.row <= 3 ? show.price_high : seat.row <= 7 ? show.price_mid : show.price_low)
            } грн`)
            .join('\n')}\n\n` +
        `💰 *Загальна сума: ${totalPrice} грн*\n\n` +
        'Підтвердити бронювання?';
}

function bookingSuccess(show, selectedSeats, totalPrice) {
    return `🎉 *Бронювання успішне!*\n\n` +
        `🎭 ${show.title}\n` +
        `📅 ${formatters.formatDate(show.date)}\n\n` +
        `Обрані місця (${selectedSeats.length}):\n` +
        `${selectedSeats
            .slice()
            .sort((a, b) => a.row - b.row || a.seat - b.seat)
            .map((seat) => `• Ряд ${seat.row}, місце ${seat.seat}`)
            .join('\n')}\n\n` +
        `💰 Загальна сума: ${totalPrice} грн\n\n` +
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
    return `🎫 *Мої бронювання*\n\nВсього бронювань: ${count}`;
}

function bookingCard(booking) {
    const date = formatters.formatDate(booking.show_date);
    const sceneType = booking.scene_type === 'main' ? 'Основна сцена' : 'Камерна сцена';
    const isPast = new Date(booking.show_date) < new Date();

    return `${isPast ? '📜' : '🎫'} *${booking.show_title}*\n\n` +
        `📅 ${date}\n` +
        `🏛 ${sceneType}\n` +
        `💺 ${booking.seats}\n` +
        `🎟 Кількість місць: ${booking.seats_count}\n` +
        `💰 ${booking.total_price} грн\n\n` +
        (isPast ? '✅ Вистава відбулася' : '⏰ Очікується');
}

function personalRecommendationsHeader() {
    return '⭐ *Персональні рекомендації*\n\nНа основі ваших вподобань:';
}

function popularRecommendationsHeader() {
    return '🔥 *Популярні вистави*\n\nЩо бронюють інші відвідувачі:';
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
    let message = '⚙️ *Поточні налаштування*\n\n';

    if (preferences.genres && preferences.genres.length > 0) {
        message += `🎭 *Жанри:* ${preferences.genres.join(', ')}\n\n`;
    } else {
        message += '🎭 *Жанри:* _не обрано_\n\n';
    }

    if (preferences.periods && preferences.periods.length > 0) {
        message += `⏰ *Періоди:* ${preferences.periods.join(', ')}\n\n`;
    } else {
        message += '⏰ *Періоди:* _не обрано_\n\n';
    }

    if (preferences.sceneType) {
        const scene = preferences.sceneType === 'main' ? 'Основна сцена' :
            preferences.sceneType === 'chamber' ? 'Камерна сцена' : 'Без різниці';
        message += `🎪 *Сцена:* ${scene}\n\n`;
    } else {
        message += '🎪 *Сцена:* _не обрано_\n\n';
    }

    message += '💡 Ці налаштування впливають на ваші персональні рекомендації.';
    return message;
}

function editPreferencesStart(currentPreferences) {
    let message = '✏️ *Редагування налаштувань*\n\n';
    message += '📋 *Поточні налаштування:*\n';

    if (currentPreferences.genres && currentPreferences.genres.length > 0) {
        message += `🎭 Жанри: ${currentPreferences.genres.join(', ')}\n`;
    } else {
        message += '🎭 Жанри: _не обрано_\n';
    }

    if (currentPreferences.periods && currentPreferences.periods.length > 0) {
        message += `⏰ Періоди: ${currentPreferences.periods.join(', ')}\n`;
    } else {
        message += '⏰ Періоди: _не обрано_\n';
    }

    if (currentPreferences.sceneType) {
        const scene = currentPreferences.sceneType === 'main' ? 'Основна сцена' :
            currentPreferences.sceneType === 'chamber' ? 'Камерна сцена' : 'Без різниці';
        message += `🎪 Сцена: ${scene}\n`;
    } else {
        message += '🎪 Сцена: _не обрано_\n';
    }

    message += '\n📝 *Крок 1/3: Жанри*\n\n';
    message += 'Які жанри вам подобаються? (можна обрати декілька)';
    return message;
}

function reminderMessage(booking) {
    const date = formatters.formatDate(booking.show_date);

    return `🔔 *НАГАДУВАННЯ*\n\n` +
        'Через 24 години у вас вистава!\n\n' +
        `🎭 ${booking.show_title}\n` +
        `📅 ${date}\n` +
        `💺 ${booking.seats || `Ряд ${booking.seat_row}, місце ${booking.seat_number}`}\n` +
        `💰 ${booking.total_price || booking.price} грн\n\n` +
        '⚠️ *Не забудьте:*\n' +
        '• Прийти за 30 хвилин\n' +
        '• Взяти документ\n' +
        '• Оплатити на касі';
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
    selectRows,
    selectSeat,
    reviewBooking,
    bookingSuccess,
    bookingError,
    myBookingsHeader,
    bookingCard,
    personalRecommendationsHeader,
    popularRecommendationsHeader,
    recommendationCard,
    settingsMenu,
    editPreferencesStart,
    reminderMessage
};