const winston = require("winston");

const logger = winston.createLogger({
  level: "error", // Уровень логирования
  format: winston.format.json(), // Формат логирования
  transports: [
    //
    // - Запись ошибок в файл.
    new winston.transports.File({ filename: "error.log", level: "error" }),
    //
    // - Вывод информации в консоль.
    new winston.transports.Console({ format: winston.format.simple() }),
  ],
});

module.exports = logger;
