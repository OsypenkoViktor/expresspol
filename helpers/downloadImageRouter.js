const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const logger = require("../logger");
const fs = require("fs");

function checkUserAuth(req, res, next) {
  const userLogin = req.signedCookies.userLogin;

  if (!userLogin) {
    return res.status(401).json({ error: "Authentification required!" });
  }
  next();
}


const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "SliderImages/");
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  },
});

const fileFilter = (req, file, cb) => {

  const allowedTypes = ["image/jpeg", "image/png", "image/gif"];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    logger.error("Type error occurred while attempting to load the image.");
    cb(new Error("this image type is not allowed")); 
  }
};

const upload = multer({ storage: storage, fileFilter: fileFilter });


router.post(
  "/admin/sliderImage",
  checkUserAuth,
  upload.single("image"),
  (req, res) => {

    if (req.fileValidationError) {
      return res.status(400).send(req.fileValidationError);
    }
    else if (req.fileError) {
      logger.error("Type error occurred while attempting to load the image.", {
        error: req.fileError,
      });
      return res.status(500).send(req.fileError);
    }
    else {
      res.status(200).json({ mesasge: "Image uploaded successfully" });
    }
  }
);

router.delete("/admin/sliderImage/:imageName", (req, res) => {
  const imageName = req.params.imageName;
  const imagePath = path.join(__dirname, "../images/", imageName);

  // Проверяем, существует ли файл
  if (fs.existsSync(imagePath)) {
    // Удаляем файл
    fs.unlinkSync(imagePath);
    res.status(200).json({ mesasge: "Image has been deleted." });
  } else {
    res.status(404).json({ mesasge: "Image not found." });
  }
});

module.exports = router;
