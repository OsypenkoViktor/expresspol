const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const logger = require("../logger");
const fs = require("fs");

function checkUserAuth(req, res, next) {
  const userLogin = req.signedCookies.userLogin;

  if (!userLogin) {
    return res.status(401).json({ error: "Необходимо войти в систему" });
  }
  next();
}

// Настройка multer для сохранения файлов в папку SliderImages
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "SliderImages/");
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname); // Сохранение с оригинальным именем
  },
});

const fileFilter = (req, file, cb) => {
  // Разрешенные типы файлов
  const allowedTypes = ["image/jpeg", "image/png", "image/gif"];

  // Проверяем тип файла
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true); // Принимаем файл
  } else {
    logger.error("Помилка типу при спробі завантаження зображення.");
    cb(new Error("Недопустимый тип файла")); // Отклоняем файл
  }
};

const upload = multer({ storage: storage, fileFilter: fileFilter });

// Маршрут для загрузки изображений
router.post(
  "/admin/sliderImage",
  checkUserAuth,
  upload.single("image"),
  (req, res) => {
    // Если Multer обнаружил ошибку при загрузке файла
    if (req.fileValidationError) {
      return res.status(400).send(req.fileValidationError);
    }
    // Если произошла другая ошибка (например, ошибка при сохранении файла)
    else if (req.fileError) {
      logger.error("Помилка при спробі завантаження зображення.", {
        error: req.fileError,
      });
      return res.status(500).send(req.fileError);
    }
    // В случае успешной загрузки файла
    else {
      res.status(200).send("Изображение успешно загружено");
    }
  }
);

router.delete("/admin/sliderImage/:imageName", (req, res) => {
  const imageName = req.params.imageName;
  const imagePath = path.join(__dirname, "../SliderImages/", imageName);

  // Проверяем, существует ли файл
  if (fs.existsSync(imagePath)) {
    // Удаляем файл
    fs.unlinkSync(imagePath);
    res.status(200).send("Изображение успешно удалено");
  } else {
    res.status(404).send("Изображение не найдено");
  }
});

module.exports = router;
