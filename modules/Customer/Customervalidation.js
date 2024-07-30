const { check } = require("express-validator");

const create = [
	check("name").isString().notEmpty().withMessage("name is required"),
	check("countryCode")
		.isString()
		.notEmpty()
		.withMessage("countryCode is required"),
	check("phoneNumber")
		.isString()
		.notEmpty()
		.withMessage("phoneNumber is required"),
	check("address").isString().notEmpty().withMessage("address is required"),

	check("managerName")
		.isString()
		.notEmpty()
		.withMessage("managerName is required"),
	check("managerCountryCode")
		.isString()
		.notEmpty()
		.withMessage("managerCountryCode is required"),
	check("managerPhoneNumber")
		.isString()
		.notEmpty()
		.withMessage("managerPhoneNumber is required"),
	check("email").isString().notEmpty().withMessage("email is required"),
	check("password").isString().notEmpty().withMessage("password is required"),
];
const block = [
	check("isBlocked")
		.trim()
		.isBoolean()
		.isIn([true, false])
		.withMessage("isBlocked value must be either true or false")
		.notEmpty()
		.withMessage("isBlocked is required"),
];

const updateVisit = [];

module.exports = {
	create,
	block,
};
