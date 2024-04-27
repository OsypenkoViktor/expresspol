const db = require("../db.js");
const bcrypt = require("bcrypt");
const logger = require("../../logger.js");

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
        .json({ error: "Необхідно вказати логін і пароль" });
    }
  } catch (error) {
    logger.error(
      "Помилка в функції перевірки паролю (хлам який треба рефакторити)",
      {
        error: error.message,
        stack: error.stack,
      }
    );
    res.status(500).json({ error: "Внутрішня помилка серверу" });
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
    const [rows] = await db.query("SELECT * FROM users WHERE login = ?", [
      login,
    ]);

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
      return res.status(401).json({ error: "Невірний пароль або логін" });
    }
    const oneHour = 3600000;
    res.cookie("userLogin", user.login, { signed: true, maxAge: oneHour });
    res.status(200).json({ message: "Аутентифікація успішна" });
  } catch (error) {
    logger.error("Помилка при аутентифікації користувача: " + error.message);
    res.status(500).json({ error: "Внутрішня помилка серверу" });
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
    logger.error(
      "Помилка при отриманні загальних данних сторінки: " + error.message
    );
    res.status(500).json({ error: "Внутрішня помилка серверу" });
  }
}

async function getCPData(req, res, exampleImgs) {
  try {
    const resJSON = {
      settings: {},
      contacts: {},
      sliderImgList: exampleImgs,
    };
    const [contacts, contactsFields] = await db.query("SELECT * FROM contacts");
    resJSON.contacts = contacts;
    const [settings, settingsFields] = await db.query("SELECT * FROM settings");
    resJSON.settings = settings;
    if (contacts.length === 0 || settings.length === 0) {
      return res.status(404).json({ error: "помилка при завантаженні данних" });
    }
    res.status(200).json(resJSON);
  } catch (error) {
    logger.error("Помилка завантаження данних для контрольної панелі:", {
      error: error.message,
      stack: error.stack,
    });
  }
}

async function updateSiteData(req, res) {
  const { email, phone, facebook, isCalculatorVisible } = req.body;
  if (!email || !phone || !facebook) {
    res
      .status(400)
      .json({ error: "Не всі необхідні данні для оновлення були відправлені" });
  }
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

    await db.query("COMMIT");
    res.status(201).json({ message: "Данні успішно оновлено" });
  } catch (error) {
    // Если произошла ошибка, откатываем транзакцию
    await db.query("ROLLBACK");
    logger.error("Помилка при оновленні контактів сайту", {
      error: error.message,
      stack: error.stack,
    });
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
    logger.error("Помилка при отриманні цін", {
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({ error: "помилка при зчитуванні цін" });
  }
}

async function createMaterial(req, res) {
  try {
    const { name, price, description } = req.body;
    if (!name || !price || !description) {
      res.status(400).json({
        error: "Не всі необхідні данні для оновлення були відправлені",
      });
      logger.info("Спроба створити матеріал з пустим полем");
    }
    const resultDB = await db.query(
      "INSERT INTO MATERIALS (name,price,description) VALUES (?,?,?)",
      [name, price, description]
    );
    if (resultDB[0].affectedRows) {
      res.status(201).json({ message: "Матеріал успішно створено." });
    } else {
      res.status(400).json({ message: "Не вдалося створити матеріал." });
    }
  } catch (error) {
    logger.error("Помилка при створенні матеріалу:", {
      error: error.message,
      stack: error.stack,
    }); // Запись ошибки в лог
    res.status(500).json({
      message: "Во время выполнения операции произошла ошибка.",
      error: error.message || "Некоторые детали ошибки отсутствуют.",
    });
  }
}

async function createService(req, res) {
  try {
    const { name, price, description } = req.body;
    if (!name || !price || !description) {
      res.status(400).json({
        error: "Не всі необхідні данні для оновлення були відправлені",
      });
      logger.info("Спроба створити сервіс з пустим полем");
    }
    const resultDB = await db.query(
      "INSERT INTO SERVICES (name,price,description) VALUES (?,?,?)",
      [name, price, description]
    );
    if (resultDB[0].affectedRows) {
      res.status(201).json({ message: "Сервіс успішно створено." });
    }
  } catch (error) {
    logger.error("Помилка при спробі створення сервісу:", {
      error: error.message,
      stack: error.stack,
    });
  }
}

async function updateMaterial(req, res) {
  try {
    const { id, name, price, description } = req.body;
    if (!name || !price || !description) {
      res.status(400).json({
        error: "Не всі необхідні данні для оновлення були відправлені",
      });
      logger.info("Спроба оновити матеріал з пустим полем");
    }
    const resultDB = await db.query(
      "UPDATE MATERIALS SET name=?,price=?,description=? WHERE id = ?",
      [name, price, description, id]
    );
    res.status(200).json({ message: `Матеріал ${name} успішно змінений.` });
  } catch (error) {
    logger.error("Помилка при спробі змінити матеріал", {
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({ error: "Помилка при спробі оновлення матеріалу" });
  }
}

async function deleteMaterial(req, res) {
  try {
    const { id } = req.body;
    if (!id) {
      res.status(400).json({
        error: "Не всі необхідні данні для оновлення були відправлені",
      });
      logger.info("Спроба видалити матеріал з пустим полем id");
    }
    const [results] = await db.query("DELETE FROM MATERIALS WHERE id= ?", [id]);
    if (results.affectedRows === 0) {
      res.status(404).json({ message: "Запис не знайдено в бд" });
    } else {
      res.status(200).json({ message: "Запис успішно видалений" });
    }
  } catch (error) {
    logger.error("Помилка при видаленні матеріалу", {
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({ error: "Внутрішня помилка серверу" });
  }
}

async function deleteService(req, res) {
  try {
    const { id } = req.body;
    if (!id) {
      res.status(400).json({
        error: "Не всі необхідні данні для оновлення були відправлені",
      });
      logger.info("Спроба видалити сервіс з пустим полем id");
    }
    const [results] = await db.query("DELETE FROM SERVICES WHERE id = ?", [id]);
    if (results.affectedRows === 0) {
      res.status(404).json({ message: "Запис не знайдено в бд" });
    } else {
      res.status(200).json({ message: "Запис успішно видалений" });
    }
  } catch (error) {
    logger.error("Помилка при спробі видалення сервісу", {
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({ error: "Внутрішня помилка серверу" });
  }
}

async function updateService(req, res) {
  try {
    const { id, name, price, description } = req.body;
    if (!name || !price || !description || !id) {
      res.status(400).json({
        error: "Не всі необхідні данні для оновлення були відправлені",
      });
      logger.info("Спроба обновити сервіс з пустим полем");
    }
    const resultDB = await db.query(
      "UPDATE SERVICES SET name=?,price=?,description=? WHERE id = ?",
      [name, price, description, id]
    );
    res.status(200).json({ message: `Сервіс ${name} успішно оновлено.` });
  } catch (error) {
    logger.error("Помилка при стробі оновлення сервісу", {
      error: error.message,
      stack: error.stack,
    });
  }
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
