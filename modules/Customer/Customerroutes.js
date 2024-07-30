const customer = require("../Customer/Customercontroller");
let router = require("express").Router();
let ValidationSchema = require("../Customer/Customervalidation");
const authJwt = require("../../middleware/authJwt.js");
const upload = require("../../middleware/upload.js");
// Create  a customer with id
router.post(
	"/",
	[authJwt.IsAdminVendor],
	ValidationSchema.create,
	customer.create
);

// Update a customer with id
router.put("/:id", [authJwt.IsAdminVendorCustomer], customer.update);

// Retrieve all customer
router.get("/", [authJwt.IsAdminVendor], customer.findAll);
// Retrieve all customer vendor
router.get(
	"/vendorCustomers",
	[authJwt.IsAdminVendor],
	customer.vendorCustomers
);

// Retrieve a single customer with id
router.get("/:id", [authJwt.IsAdminVendorCustomer], customer.findOne);

// Delete a customer with id
router.delete("/:id", [authJwt.IsAdminVendor], customer.delete);

// Block a customer with id
router.put(
	"/block/:id",
	[authJwt.IsAdminVendor],
	ValidationSchema.block,
	customer.block
);
// create excel
router.get("/create/excel", [authJwt.IsAdminVendor], customer.excelSheet);


// Create  a customer with id
router.post(
	"/upload",
	[authJwt.IsAdminVendor],
	upload.upload.fields([{ name: "image" }]),
	// ValidationSchema.create,
	customer.uploadImage
);

module.exports = router;
