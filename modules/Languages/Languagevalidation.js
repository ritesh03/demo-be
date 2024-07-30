const { check } = require("express-validator");

const create = [
	check("name").isString().notEmpty().withMessage("name is required"),
	check("countryCode")
		.isString()
		.notEmpty()
		.withMessage("countryCode is required"),

];
const getLanguageString = [
	check("id")
		.trim()
		.isString()
		.notEmpty()
		.withMessage("id is required"),
];

const updateVisit = [];

module.exports = {
	create,
	getLanguageString,
};
