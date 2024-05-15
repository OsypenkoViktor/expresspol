const db = require("../db.js");
const bcrypt = require("bcrypt");
const logger = require("../../logger.js");


async function checkRequest(req, res) {
  try {
    const { login, password } = req.body;

    if (!login || !password) {
      return res
        .status(400)
        .json({ error: "Login and password fields required" });
    }
  } catch (error) {
    logger.error(
      "error while checking password",
      {
        error: error.message,
        stack: error.stack,
      }
    );
    res.status(500).json({ error: "Server error" });
  }
}


async function userAuth(req, res) {
  const { login, password } = req.body;
  if (!login || !password) {
    res.status(400).json({ error: "no login data" });
  }
  try {
    const [rows] = await db.query("SELECT * FROM users WHERE login = ?", [
      login,
    ]);

    if (rows.length === 0) {
      return res
        .status(404)
        .json({ error: "Cant find user login in data base." });
    }

    const user = rows[0];
    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      return res.status(401).json({ error: "Incorrect password or login" });
    }
    const oneHour = 3600000;
    res.cookie("userLogin", user.login, { signed: true, maxAge: oneHour });
    res.status(200).json({ message: "Authenticated" });
  } catch (error) {
    logger.error("Auth error: " + error.message);
    res.status(500).json({ error: "Server error" });
  }
}


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
        .json({ error: "Site settings not found" });
    }
    res.status(200).json(resJSON);
  } catch (error) {
    logger.error(
      "Error occured while attenpting to load initial site data" + error.message
    );
    res.status(500).json({ error: "Server error" });
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
      return res.status(404).json({ error: "Error occured while attenpting to load control panel data" });
    }
    res.status(200).json(resJSON);
  } catch (error) {
    logger.error("Error occured while attenpting to load control panel data", {
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
      .json({ error: "missing data to update" });
  }
  try {
    await db.query("START TRANSACTION");

    await db.query(
      "UPDATE CONTACTS SET VALUE = ? WHERE TYPE = 'PhoneNumber'",
      phone
    );

    await db.query("UPDATE CONTACTS SET VALUE = ? WHERE TYPE = 'Email'", email);

    await db.query(
      "UPDATE CONTACTS SET VALUE = ? WHERE TYPE = 'Facebook'",
      facebook
    );

    await db.query(
      "UPDATE SETTINGS SET VALUE = ? WHERE name = 'isCalculatorVisible'",
      isCalculatorVisible
    );

    await db.query("COMMIT");
    res.status(201).json({ message: "Updated" });
  } catch (error) {
    await db.query("ROLLBACK");
    logger.error("Error occured while attenpting to update control panel data", {
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
    logger.error("Error occured while fetching price data", {
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({ error: "Error occured while fetching price data" });
  }
}

async function createMaterial(req, res) {
  try {
    const { name, price, description } = req.body;
    if (!name || !price || !description) {
      res.status(400).json({
        error: "missing material data",
      });
      logger.info("missing material data");
    }
    const resultDB = await db.query(
      "INSERT INTO MATERIALS (name,price,description) VALUES (?,?,?)",
      [name, price, description]
    );
    if (resultDB[0].affectedRows) {
      res.status(201).json({ message: "Material created." });
    } else {
      res.status(400).json({ message: "Material not created." });
    }
  } catch (error) {
    logger.error("Material not created:", {
      error: error.message,
      stack: error.stack,
    }); // Запись ошибки в лог
    res.status(500).json({
      message: "Server error.",
      error: error.message || "Server error.",
    });
  }
}

async function createService(req, res) {
  try {
    const { name, price, description } = req.body;
    if (!name || !price || !description) {
      res.status(400).json({
        error: "Missing data",
      });
      logger.info("Missing data for new service");
    }
    const resultDB = await db.query(
      "INSERT INTO SERVICES (name,price,description) VALUES (?,?,?)",
      [name, price, description]
    );
    if (resultDB[0].affectedRows) {
      res.status(201).json({ message: "Created" });
    }
  } catch (error) {
    logger.error("Service not created:", {
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
        error: "Not all necessary data for update were provided",
      });
      logger.info("Attempt to update material with empty field");
    }
    const resultDB = await db.query(
      "UPDATE MATERIALS SET name=?,price=?,description=? WHERE id = ?",
      [name, price, description, id]
    );
    res.status(200).json({ message: `Material ${name} successfully updated.` });
  } catch (error) {
    logger.error("Error while attempting to update material", {
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({ error: "Internal server error" });
  }
}

async function deleteMaterial(req, res) {
  try {
    const { id } = req.body;
    if (!id) {
      res.status(400).json({
        error: "Not all necessary data for update were provided",
      });
      logger.info("Attempt to delete material with empty id field");
    }
    const [results] = await db.query("DELETE FROM MATERIALS WHERE id= ?", [id]);
    if (results.affectedRows === 0) {
      res.status(404).json({ message: "Record not found in database" });
    } else {
      res.status(200).json({ message: "Record successfully deleted" });
    }
  } catch (error) {
    logger.error("Error while deleting material", {
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({ error: "Internal server error" });
  }
}

async function deleteService(req, res) {
  try {
    const { id } = req.body;
    if (!id) {
      res.status(400).json({
        error: "Not all necessary data for update were provided",
      });
      logger.info("Attempt to delete service with empty id field");
    }
    const [results] = await db.query("DELETE FROM SERVICES WHERE id = ?", [id]);
    if (results.affectedRows === 0) {
      res.status(404).json({ message: "Record not found in database" });
    } else {
      res.status(200).json({ message: "Record successfully deleted" });
    }
  } catch (error) {
    logger.error("Error while attempting to delete service", {
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({ error: "Internal server error" });
  }
}

async function updateService(req, res) {
  try {
    const { id, name, price, description } = req.body;
    if (!name || !price || !description || !id) {
      res.status(400).json({
        error: "Not all necessary data for update were provided",
      });
      logger.info("Attempt to update service with empty field");
    }
    const resultDB = await db.query(
      "UPDATE SERVICES SET name=?,price=?,description=? WHERE id = ?",
      [name, price, description, id]
    );
    res.status(200).json({ message: `Service ${name} successfully updated.` });
  } catch (error) {
    logger.error("Error while attempting to update service", {
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
