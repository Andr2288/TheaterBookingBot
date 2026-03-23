function formatDate(dateString) {
    const date = new Date(dateString);

    const options = {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        hour: '2-digit',
        minute: '2-digit'
    };

    return date.toLocaleDateString('uk-UA', options);
}

function formatPrice(price) {
    return `${parseFloat(price).toFixed(0)} грн`;
}

function formatTime(dateString) {
    const date = new Date(dateString);
    return date.toLocaleTimeString('uk-UA', {
        hour: '2-digit',
        minute: '2-digit'
    });
}

module.exports = {
    formatDate,
    formatPrice,
    formatTime
};