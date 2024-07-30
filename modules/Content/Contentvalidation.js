const { check } = require("express-validator");

const create = [
	check("name").isString().notEmpty().withMessage("Name is required"),
	check("heading").isString().notEmpty().withMessage("Heading is required"),
	check("subHeading").isString().notEmpty().withMessage("Sub-heading is required"),
	// check("priority").isNumeric().notEmpty().withMessage("Priority is required"),
];

const update = [
	check("name").isString().notEmpty().withMessage("Name is required"),
	check("heading").isString().notEmpty().withMessage("Heading is required"),
	check("subHeading").isString().notEmpty().withMessage("Sub-heading is required"),
];

module.exports = {
	create,
	update
};