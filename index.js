require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");

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
} = require("./db/dbOperations/dbOperations.js");

const app = express();
const port = process.env.PORT;

const staticFolderPath = path.join(__dirname, "SliderImages");

app.use(express.json());

app.use("/SliderImages", express.static(staticFolderPath));

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", process.env.CORS_DOMEN); // Разрешить доступ с любых доменов
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE,PATCH"); // Разрешить методы запросов
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization"); // Разрешить заголовки запросов
  next();
});

app.use(cookieParser(process.env.COOKIE_SECRET));

app.get("/", async (req, res) => {
  fs.readdir(staticFolderPath, (err, files) => {
    if (err) {
      return res.status(500).json({ error: "Internal server error" });
    }
    getInitialSiteData(req, res, files);
  });
});

app.post("/login", async (req, res) => {
  await checkRequest(req, res);
  await userAuth(req, res);
});

app.get("/admin", checkUserAuth, async (req, res) => {
  fs.readdir(staticFolderPath, (err, files) => {
    if (err) {
      return res.status(500).json({ error: "Internal server error" });
    }
    getCPData(req, res, files);
  });
});

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
    res.setHeader("Access-Control-Allow-Origin", process.env.CORS_DOMEN);
    return res.status(401).json({ error: "Необходимо войти в систему" });
  }
  next();
}
