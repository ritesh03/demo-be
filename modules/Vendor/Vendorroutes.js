const vendor = require("../Vendor/Vendorcontroller");
let router = require("express").Router();
let ValidationSchema = require("../Vendor/Vendorvalidation");
const authJwt = require("../../middleware/authJwt.js");

// Create  a vendor with id
router.post("/", [authJwt.isAdmin], ValidationSchema.create, vendor.create);

// Update a vendor with id
router.put(
	"/:id",
	[authJwt.IsAdminVendor],

	vendor.update
);

// Retrieve all vendor
router.get("/", [authJwt.isAdmin], vendor.findAll);

// Retrieve a single vendor with id
router.get("/:id", [authJwt.IsAdminVendor], vendor.findOne);

// Delete a vendor with id
router.delete("/:id", [authJwt.isAdmin], vendor.delete);

// Block a Vender with id
router.put(
	"/block/:id",
	[authJwt.isAdmin],
	ValidationSchema.block,
	vendor.block
);
// Block a Vender with id
router.get("/create/excel", [authJwt.isAdmin], vendor.excelSheet);

module.exports = router;
