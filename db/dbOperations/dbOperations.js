const db = require("../db.js");
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
  if (!login || !password) {
    res.status(400).json({ error: "не вказані данні для входу" });
  }
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
        .json({ error: "Користувач з таким логіном не знайдений." });
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

/**
 * Відправка інформації необхідної для завантаження сторінки.
 * @param {*} req
 * @param {*} res об'ект з налаштуваннями, контактами для головної сторінки сайту
 * @returns
 */
async function getInitialSiteData(req, res, sliderImgList) {
  const resJSON = {
    settings: {},
    contacts: {},
    sliderImgList: sliderImgList,
  };
  try {
    const [settings] = await db.query("SELECT * FROM settings");
    resJSON.settings = settings;
    const [contacts] = await db.query("SELECT * FROM contacts");
    resJSON.contacts = contacts;

    if (settings.length === 0 || contacts.length === 0) {
      return res
        .status(404)
        .json({ error: "Налаштування сторінки не знайдено" });
    }
    res.status(200).json(resJSON);
  } catch (error) {
    console.error("Помилка при отриманні данних", error);
    res.status(500).json({ error: "Внутрішня помилка серверу" });
  }
}

async function getCPData(req, res, exampleImgs) {
  const resJSON = {
    settings: {},
    contacts: {},
    sliderImgList: exampleImgs,
  };
  const [contacts] = await db.query("SELECT * FROM contacts");
  resJSON.contacts = contacts;
  const [settings] = await db.query("SELECT * FROM settings");
  resJSON.settings = settings;
  if (contacts.length === 0 || settings.length === 0) {
    return res.status(404).json({ error: "помилка при завантаженні данних" });
  }
  res.status(200).json(resJSON);
}

async function updateSiteData(req, res) {
  const { email, phone, facebook, isCalculatorVisible } = req.body;
  try {
    // Начало транзакции
    await db.query("START TRANSACTION");

    // Выполнение первого запроса
    await db.query(
      "UPDATE CONTACTS SET VALUE = ? WHERE TYPE = 'PhoneNumber'",
      phone
    );

    // Выполнение второго запроса
    await db.query("UPDATE CONTACTS SET VALUE = ? WHERE TYPE = 'Email'", email);

    // Выполнение третьего запроса
    await db.query(
      "UPDATE CONTACTS SET VALUE = ? WHERE TYPE = 'Facebook'",
      facebook
    );

    await db.query(
      "UPDATE SETTINGS SET VALUE = ? WHERE name = 'isCalculatorVisible'",
      isCalculatorVisible
    );
    console.log(isCalculatorVisible);

    // Подтверждение транзакции, если все запросы выполнены успешно
    await db.query("COMMIT");

    console.log("Все запросы успешно выполнены");
    res.status(201).json({ message: "Данные обновлены" });
  } catch (error) {
    // Если произошла ошибка, откатываем транзакцию
    await db.query("ROLLBACK");

    console.error("Ошибка при выполнении запросов:", error);
    res.status(500).json({ error: error });
  }
}

async function getPrices(req, res) {
  const responsePricesJSSON = {};
  try {
    const [materialsPrices] = await db.query("SELECT * FROM materials");
    const [servicesPrices] = await db.query("SELECT * FROM services");
    responsePricesJSSON.ceilingMaterials = materialsPrices;
    responsePricesJSSON.services = servicesPrices;
    res.status(200).json(responsePricesJSSON);
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "помилка при зчитуванні цін" });
  }
}

async function createMaterial(req, res) {
  try {
    const { name, price, description } = req.body;
    const resultDB = await db.query(
      "INSERT INTO MATERIALS (name,price,description) VALUES (?,?,?)",
      [name, price, description]
    );
    if (resultDB[0].affectedRows) {
      res.status(201).json({ message: "Матеріал успішно створено." });
    }
  } catch (error) {
    console.log(error);
  }
}

async function createService(req, res) {
  try {
    const { name, price, description } = req.body;
    const resultDB = await db.query(
      "INSERT INTO SERVICES (name,price,description) VALUES (?,?,?)",
      [name, price, description]
    );
    if (resultDB[0].affectedRows) {
      res.status(201).json({ message: "Сервіс успішно створено." });
    }
  } catch (error) {
    console.log(error);
  }
}

async function updateMaterial(req, res) {
  const { id, name, price, description } = req.body;

  const resultDB = await db.query(
    "UPDATE MATERIALS SET name=?,price=?,description=? WHERE id = ?",
    [name, price, description, id]
  );
  console.log(resultDB);
  res.status(200).json({ message: "update response" });
}

async function deleteMaterial(req, res) {
  try {
    const { id } = req.body;
    const [results] = await db.query("DELETE FROM MATERIALS WHERE id= ?", [id]);
    if (results.affectedRows === 0) {
      res.status(404).json({ message: "Запис не знайдено в бд" });
    } else {
      res.status(200).json({ message: "Запис успішно видалений" });
    }
  } catch (error) {
    console.log(error);
  }
}

async function deleteService(req, res) {
  try {
    const { id } = req.body;
    const [results] = await db.query("DELETE FROM SERVICES WHERE id = ?", [id]);
    if (results.affectedRows === 0) {
      res.status(404).json({ message: "Запис не знайдено в бд" });
    } else {
      res.status(200).json({ message: "Запис успішно видалений" });
    }
  } catch (error) {
    console.log(error);
  }
}

async function updateService(req, res) {
  const { id, name, price, description } = req.body;

  const resultDB = await db.query(
    "UPDATE SERVICES SET name=?,price=?,description=? WHERE id = ?",
    [name, price, description, id]
  );
  console.log(resultDB);
  res.status(200).json({ message: "update response" });
}

module.exports = {
  checkRequest,
  userAuth,
  getInitialSiteData,
  getCPData,
  updateSiteData,
  getPrices,
  updateMaterial,
  updateService,
  deleteMaterial,
  deleteService,
  createMaterial,
  createService,
};
