const admin = require("../Admin/Admincontroller");
const router = require("express").Router();
const authJwt = require("../../middleware/authJwt.js");
const ValidationSchema = require("../Admin/Adminvalidation");

// Create a new super admin
router.post("/", ValidationSchema.create, admin.create);
// Login For all users
router.post("/login", ValidationSchema.login, admin.login);
// To Show the Dashboard Analytics
router.get("/dashboard", [authJwt.IsAdminVendorCustomer], admin.dashboard);
//forget password
router.put("/forgetPassword", admin.forgetPassword);

//change password
router.put(
	"/changePassword",
	[authJwt.IsAdminVendorCustomer],
	admin.changePassword
);

module.exports = router;
