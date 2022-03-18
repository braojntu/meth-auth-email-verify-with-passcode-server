const express = require("express");
const {createUser} = require("../controllers/user");
const {validateUser, validate} = require("../middlewares/validator");
const router = express.Router();

router.post("/create", validateUser, validate, createUser);

module.exports = router;
