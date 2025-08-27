const questions = require("./questions");

function getAnswer(message) {
    message = message.toLowerCase();

    for (let q of questions) {
        if (q.keywords.some(keyword => message.includes(keyword))) {
            return q.answer;
        }
    }

    return "Maaf, saya belum punya jawaban untuk itu. Coba tanyakan hobi atau minatmu.";
}

module.exports = {
    getAnswer
};
