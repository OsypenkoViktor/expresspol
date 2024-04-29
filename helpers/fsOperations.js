const path = require("path");
const fs = require("fs");
const logger = require("../logger");
const { promisify } = require("util");


const readdir = promisify(fs.readdir);

async function getSliderImagesArray(staticFolderPath, res) {
  try {
    const files = await readdir(staticFolderPath);
    return files;
  } catch (error) {
    logger.error("Не вдалося отримати список зображень слайдеру", {
      error: error.message,
      stack: error.stack,
    });
    res
      .status(500)
      .json({ error: "Не вдалося отримати список зображень слайдеру" });
  }
}

async function downloadSliderimage(req,res){

}

module.exports = {
  getSliderImagesArray,
};
