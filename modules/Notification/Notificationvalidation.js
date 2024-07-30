const { check } = require("express-validator");
const sendNotification = [
	// check("message").isString().notEmpty().withMessage("message is required"),

]
const getNotifications = [
	// check("message").isString().notEmpty().withMessage("message is required"),

]

module.exports = {
	sendNotification,
	getNotifications,
	
};
