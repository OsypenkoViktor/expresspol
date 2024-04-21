const db = require("./db.js");
const bcrypt = require("bcrypt");

/**
 * Перевірка, чи відповідає запрос потребам серверу
 * @param {Request} req - запит експреса
 * @param {Response} res - відповідь сервера
 */
async function checkRequest(req, res) {
  try {
    const { login, password } = req.body;

    if (!login || !password) {
      return res
        .status(400)
        .json({ error: "Необходимо указать логин и пароль" });
    }
    // Ваш код аутентификации здесь...
  } catch (error) {
    console.error("Ошибка при обработке запроса:", error);
    res.status(500).json({ error: "Внутренняя ошибка сервера" });
  }
}

/**
 * Логіка аутентифікації користувача на сервері
 * @param {Request} req - запит експреса
 * @param {Response} res - відповідь сервера
 */
async function userAuth(req, res) {
  const { login, password } = req.body;

  try {
    // Проверяем, есть ли пользователь с таким логином в базе данных
    const [rows, fields] = await db.query(
      "SELECT * FROM users WHERE login = ?",
      [login]
    );

    if (rows.length === 0) {
      // Если пользователь с таким логином не найден, отправляем ошибку
      return res
        .status(404)
        .json({ error: "Пользователь с указанным логином не найден" });
    }

    // Сравниваем введенный пароль с хешированным паролем из базы данных
    const user = rows[0];
    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      // Если пароли не совпадают, отправляем ошибку
      return res.status(401).json({ error: "Неверный пароль" });
    }
    const oneHour = 3600000;
    res.cookie("userLogin", user.login, { signed: true, maxAge: oneHour });
    // Если аутентификация прошла успешно, отправляем успешный ответ
    res.status(200).json({ message: "Аутентификация успешна" });
  } catch (error) {
    console.error("Ошибка при аутентификации:", error);
    res.status(500).json({ error: "Внутренняя ошибка сервера" });
  }
}

module.exports = {
  checkRequest,
  userAuth,
};
