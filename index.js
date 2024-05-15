require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const downloadImgRouter = require("./helpers/downloadImageRouter.js");

const cookieParser = require("cookie-parser");

const {
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
} = require("./helpers/dbOperations/dbOperations.js");

const { getSliderImagesArray } = require("./helpers/fsOperations.js");

const app = express();
const port = process.env.PORT;

const staticFolderPath = path.join(__dirname, "images");

app.use(express.json());
app.use("/images", express.static(staticFolderPath));

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", process.env.CORS_DOMEN);
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE,PATCH");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  next();
});

app.use(cookieParser(process.env.COOKIE_SECRET));

app.get("/", async (req, res) => {
  const files = await getSliderImagesArray(staticFolderPath, res);
  getInitialSiteData(req, res, files);
});

app.use("/", downloadImgRouter);

app.post("/login", async (req, res) => {
  await checkRequest(req, res);
  await userAuth(req, res);
});

app.get("/admin", checkUserAuth, async (req, res) => {
  const files = await getSliderImagesArray(staticFolderPath, res);
  getCPData(req, res, files);
});

app.post("/admin/sliderImage", async (req, res) => {});

app.get("/prices", async (req, res) => {
  await getPrices(req, res);
});

app.patch("/prices/material", checkUserAuth, async (req, res) => {
  updateMaterial(req, res);
});

app.patch("/prices/service", checkUserAuth, async (req, res) => {
  updateService(req, res);
});

app.delete("/prices/material", checkUserAuth, async (req, res) => {
  deleteMaterial(req, res);
});

app.post("/prices/material", checkUserAuth, async (req, res) => {
  createMaterial(req, res);
});

app.post("/prices/service", checkUserAuth, async (req, res) => {
  createService(req, res);
});

app.delete("/prices/service", checkUserAuth, async (req, res) => {
  deleteService(req, res);
});

app.patch("/admin/site", async (req, res) => {
  updateSiteData(req, res);
});

app.listen(port, () => {
  console.log(`Polsky_backend listening on port ${port}`);
});

function checkUserAuth(req, res, next) {
  const userLogin = req.signedCookies.userLogin;

  if (!userLogin) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}
