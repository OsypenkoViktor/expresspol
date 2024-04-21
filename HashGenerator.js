const bcrypt = require("bcrypt");
const saltRounds = 10; // Количество "соли", используемое для усиления хеширования

// Пароль, который вы хотите хешировать
const plainPassword = "gCare42Nfgh@p";

// Генерация соли и хеширование пароля
bcrypt.hash(plainPassword, saltRounds, (err, hash) => {
  if (err) {
    // Обработка ошибки
    console.error("Error hashing password:", err);
  } else {
    // Ваш хеш пароля
    console.log("Hashed password:", hash);
  }
});
