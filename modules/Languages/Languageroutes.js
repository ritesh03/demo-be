const language = require("./Languagecontroller");
let router = require("express").Router();
let ValidationSchema = require("./Languagevalidation");
const authJwt = require("../../middleware/authJwt.js");

// Retrieve all customer
router.get("/", language.findAll);
router.post("/getString", ValidationSchema.getLanguageString,language.getLanguageString);

module.exports = router;