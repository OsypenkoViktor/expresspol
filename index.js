require("dotenv").config();

const express = require("express");
const cors = require("cors");

const cookieParser = require("cookie-parser");

const { checkRequest, userAuth } = require("./auth.js");

const app = express();
const port = process.env.PORT;

app.use(express.json());

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", process.env.CORS_DOMEN); // Разрешить доступ с любых доменов
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE"); // Разрешить методы запросов
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization"); // Разрешить заголовки запросов
  next();
});

app.use(cookieParser(process.env.COOKIE_SECRET));

app.get("/", async (req, res) => {
  res.send("ok");
});

app.post("/login", async (req, res) => {
  await checkRequest(req, res);
  await userAuth(req, res);
});

app.get("/test", checkUserAuth, (req, res) => {
  res.send("protected rout");
});

app.listen(port, () => {
  console.log(`Polsky_backend listening on port ${port}`);
});

function checkUserAuth(req, res, next) {
  const userLogin = req.signedCookies.userLogin;

  if (!userLogin) {
    return res.status(401).json({ error: "Необходимо войти в систему" });
  }
  next();
}
