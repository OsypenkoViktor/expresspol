//site admin data created manually with this helper - only one admin required
const bcrypt = require("bcrypt");
const saltRounds = 10; 

const plainPassword = "gCare42Nfgh@p";


bcrypt.hash(plainPassword, saltRounds, (err, hash) => {
  if (err) {
    console.error("Error hashing password:", err);
  } else {
    console.log("Hashed password:", hash);
  }
});
