const { check, query, param } = require("express-validator");

const create = [
	// check('propertyId').isArray().notEmpty().withMessage('propertyId is required'),
	check("name").isString().notEmpty().withMessage("name is required"),
	check("email").isString().notEmpty().withMessage("email is required"),
	check("password").isString().notEmpty().withMessage("password is required"),
];
const login = [
	check("email").isString().notEmpty().withMessage("email is required"),
	check("password").isString().notEmpty().withMessage("password is required"),
];

module.exports = {
	create,
	login,
};
