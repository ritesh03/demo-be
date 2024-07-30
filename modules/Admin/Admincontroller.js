const MESSAGE = require("../../constant/message.json");
const response = require("../../helper/response");
const config = require("../../config/auth.config");
const generator = require("generate-password");
const mongoose = require("mongoose");
const templates = require("../../emailTemplate/templates");

const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const common = require("../../middleware/common");
const mail = require("../../middleware/mail");
const Admin = require("../Admin/Adminmodel");
const Vendor = require("../Vendor/Vendormodel");
const Customer = require("../Customer/Customermodel");
const Patient = require("../Patient/Patientmodel");
const Ecg = require("../Ecg/Ecgmodel");
const fs = require("fs");
const path = require("path");
const { matchedData, validationResult } = require("express-validator");
const {
	getPagination,
	Failures,
	getCapitalizeString,
} = require("../../middleware/common");

const backupDatabase = require("../../middleware/backupDatabase");
const schedule = require("node-schedule");
// schedule.scheduleJob("*/10 * * * * *", async (req, res, err) => {
// 	console.log('Successfully Mail Sent ADMIN CONTRILEr')
//   })

// Create and Save a new Admin
exports.create = async (req, res) => {
	// Validate request
	console.log(req.body.email);
	try {
		// Validate request
		const errors = validationResult(req).formatWith(Failures);
		if (!errors.isEmpty()) {
			return res.status(422).json({ errors: errors.array() });
		}
		let user = await Admin.findOne({
			email: req.body.email,
		}).exec();
		if (user) {
			return response.errorMsgResponse(res, 200, MESSAGE.ALREADY_RECORD);
		}

		// Create a User
		let password = await bcrypt.hash(req.body.password, 10);
		req.body.password = password;
		console.log(req.body.email);
		await Admin.create(req.body);
		return response.successResponse(res, 200);
	} catch (err) {
		return response.errorMsgResponse(
			res,
			500,
			err.message || "Some error occurred while add Admin."
		);
	}
};

// To Login Admin from the database.
exports.login = async (req, res) => {
	// console.log(eightDaysIsoString, "eightDaysIsoString");
	let email = req.body.email.toLowerCase();
	let user;
	let type;
	let name;
	let isTempPassword;
	let customerCode;
    let vendor;
	try {
		// Validate request
		const errors = validationResult(req).formatWith(Failures);
		if (!errors.isEmpty()) {
			return res.status(422).json({ errors: errors.array() });
		}

		const adminUser = await Admin.findOne({
			email: email,
		}).exec();
		const vendorUser = await Vendor.findOne({
			email: email,
			isDeleted: false,
		}).exec();
		const customerUser = await Customer.findOne({
			email: email,
			isDeleted: false,
		}).exec();
		const patientUser = await Patient.findOne({
			email: email,
			isDeleted: false,
		}).exec();
		console.log(adminUser, "adminUser");
		// Check if any of the user variables are not null
		if (adminUser) {
			user = adminUser;
			type = "Admin";
			name = adminUser.name ? adminUser.name : "Admin";
			isTempPassword = adminUser.isTempPassword;
		} else if (vendorUser) {
			user = vendorUser;
			type = "Vendor";
			name = vendorUser.companyName ? vendorUser.companyName : "Vendor";
			isTempPassword = vendorUser.isTempPassword;
		} else if (customerUser) {
			user = customerUser;
			type = "Customer";
			name = customerUser.name ? customerUser.name : "Customer";
			isTempPassword = customerUser.isTempPassword;
			customerCode = customerUser.uniqueCode

			vendor = await Vendor.findOne({
				_id: customerUser.vendorId,
				isDeleted: false,
			}).exec();
		}
		// if (patientUser) {
		// 	user = patientUser;
		// 	type = "User";
		// 	name = patientUser.name ? patientUser.name : "User";
		// 	isTempPassword = patientUser.isTempPassword;
		// }
		// else
		else {
			return response.errorMsgResponse(
				res,
				400,
				MESSAGE.ACCOUNT_NOT_REGISTERED
			);
		}

		if (!user) {
			return response.errorMsgResponse(
				res,
				400,
				MESSAGE.ACCOUNT_NOT_REGISTERED
			);
		}
		// if (user) {
		// 	console.log(user, "useruseruser");
		// 	if (user.isDeleted == true) {
		// 		return response.errorMsgResponse(
		// 			res,
		// 			400,
		// 			MESSAGE.ACCOUNT_NOT_REGISTERED
		// 		);
		// 	}
		// }
		const isEqual = await bcrypt.compare(req.body.password, user.password);
		console.log(isEqual);
		if (!isEqual) {
			return response.errorMsgResponse(
				res,
				400,
				MESSAGE.INVALID_CREDENTIALS
			);
		}

		const token = jwt.sign({ id: user.id }, config.secret, {
			expiresIn: "60d",
		});
		if (token) {
			let resData = {};
			resData.token = token;
			resData.type = type;
			resData.name = name;
			resData.isTempPassword = isTempPassword;
			resData.hospitalCode = customerCode;

			if(customerUser && vendor){
				resData.companyName = vendor.companyName
				resData.uniqueCode = vendor.uniqueCode
			}
			return response.successResponseWithData(
				res,
				200,
				resData,
				MESSAGE.LOGIN_SUCCESS
			);
		}
	} catch (err) {
		return response.errorMsgResponse(
			res,
			500,
			err.message || "Some error occurred while login."
		);
	}
};

// Retrieve Dashboard Analytics
exports.dashboard = async (req, res) => {
	try {
		console.log(req.role, "req.role");
		// functionality
		let resData = {};
		const currentDateForHour = new Date(); // Get the current date and time
		const currentDate = new Date(); // Get the current date and time
		console.log(currentDate, currentDate, "currentDate");
		// const currentDate = new Date();

		currentDate.setHours(23, 59, 59, 999);
		const startOfMonth = new Date(
			currentDate.getFullYear(),
			currentDate.getMonth(),
			1
		);
		startOfMonth.setHours(0, 0, 0, 0);

		// Calculate the end of the previous month
		// const endOfMonth = new Date(
		// 	currentDate.getFullYear(),
		// 	currentDate.getMonth(),
		// 	0
		// );
		// endOfMonth.setDate(endOfMonth.getDate() + 1);

		// console.log(currentDate, currentDate, "currentDate");
		// filter for 24 hours
		const startOf24Hours = new Date(currentDateForHour);
		startOf24Hours.setHours(currentDateForHour.getHours() - 24);
		console.log(startOf24Hours, "startOf24Hours");
		// Create an aggregation pipeline to count documents for each month over the last six months
		const sixMonthsAgo = new Date(
			currentDate.getFullYear(),
			currentDate.getMonth() - 5,
			1
		);
		//multiple conditions for customer vendor patient
		let match = { isDeleted: false };
		if (req.role == 2) {
			match = {
				vendorId: new mongoose.Types.ObjectId(req.vendorId),
				isDeleted: false,
			};
		} else if (req.role == 3) {
			match = {
				customerId: new mongoose.Types.ObjectId(req.customerId),
				isDeleted: false,
			};
		}
		const aggregationPipeline = [
			{
				$match: {
					createdAt: {
						$gte: sixMonthsAgo,
						$lte: currentDate,
					},
					// Add any additional conditions here if needed
				},
			},
			{
				$match: match,
			},
			{
				$group: {
					_id: {
						year: { $year: "$createdAt" }, // Extract the year from the date field
						month: { $month: "$createdAt" }, // Extract the month from the date field
					},
					count: { $sum: 1 }, // Count the number of documents for each group
				},
			},
			{
				$sort: {
					"_id.year": 1, // Sort by year in ascending order
					"_id.month": 1, // Then sort by month in ascending order
				},
			},
		];

		let data;
		let condition = { isDeleted: false };

		//vendor dashboard
		const vendorTotalCount = await Vendor.countDocuments({
			...condition,
		}).exec();

		// Create a query to count documents for the current month
		const vendorCountPastMonth = await Vendor.countDocuments({
			...condition,
			createdAt: {
				$gte: startOfMonth,
				$lte: currentDate,
			},
		}).exec();
		const vendorCountPastSixMonths = await Vendor.aggregate(
			aggregationPipeline
		).exec();

		console.log(req.vendorId, "req.vendorId");

		if (req.role == 2) {
			condition = {
				vendorId: new mongoose.Types.ObjectId(req.vendorId),
				isDeleted: false,
			};
		} else {
			condition = { isDeleted: false };
		}
		console.log(condition, "conditioncondition");

		//customer dashboard
		const customerTotalCount = await Customer.countDocuments({
			...condition,
		}).exec();
		console.log(customerTotalCount, "customerTotalCount");
		// Calculate the start date for the past week (7 days ago)
		// Customer
		const startOfWeek = new Date(currentDate);
		startOfWeek.setDate(currentDate.getDate() - 7);

		// Create a query to count documents for the past week and past 24 hours
		const customerCountPastWeek = await Customer.countDocuments({
			...condition,
			createdAt: {
				$gte: startOfWeek,
				$lte: currentDate, // Up to the current date
			},
		}).exec();
		// Calculate the start date for the past 24 hours

		const customerCountPast24Hours = await Customer.countDocuments({
			...condition,
			createdAt: {
				$gte: startOf24Hours,
				$lte: currentDateForHour, // Up to the current date
			},
		}).exec();
		// Create a query to count documents for the current month
		const customerCountPastMonth = await Customer.countDocuments({
			...condition,
			createdAt: {
				$gte: startOfMonth,
				$lte: currentDate,
			},
		}).exec();
		// Display the counts with month names for the last five months

		const customerCountPastSixMonths = await Customer.aggregate(
			aggregationPipeline
		).exec();
		// conditions for patients
		let conditionForPatient = {};
		if (req.role == 2) {
			conditionForPatient = {
				vendorId: new mongoose.Types.ObjectId(req.vendorId),
				isDeleted: false,
			};
		} else if (req.role == 3) {
			conditionForPatient = {
				customerId: new mongoose.Types.ObjectId(req.customerId),
				isDeleted: false,
			};
		} else {
			conditionForPatient = { isDeleted: false };
		}
		let conditionForPatientArray = { isDeleted: false };
		if (req.role == 2) {
			conditionForPatientArray = {
				vendorId: new mongoose.Types.ObjectId(req.vendorId),
				isDeleted: false,
			};
		} else if (req.role == 3) {
			conditionForPatientArray = {
				customerId: new mongoose.Types.ObjectId(req.customerId),
				isDeleted: false,
			};
		} else {
			conditionForPatientArray = {
				isDeleted: false,
			};
		}
		console.log(conditionForPatientArray, "conditionForPatient");
		// patient dashboard
		let patientIds = [];
		const patientDetails = await Patient.find({
			...conditionForPatient,
		}).exec();
		const patientTotal = await Patient.find({
			...conditionForPatientArray,
		}).exec();
		if (patientTotal.length && patientTotal) {
			patientTotal.map(patient => {
				patientIds.push(patient._id);
			});
		}
		console.log(patientIds.length, "patientIds");

		const patientCountPastMonth = await Patient.countDocuments({
			...conditionForPatient,
			createdAt: {
				$gte: startOfMonth,
				$lte: currentDate, // Up to the current date
			},
		}).exec();
		const patientCountPast24Hours = await Patient.countDocuments({
			...conditionForPatient,
			createdAt: {
				$gte: startOf24Hours,
				$lte: currentDateForHour, // Up to the current date
			},
		}).exec();

		const patientCountPastWeek = await Patient.countDocuments({
			...conditionForPatient,
			createdAt: {
				$gte: startOfWeek,
				$lte: currentDate, // Up to the current date
			},
		}).exec();
		const patientCountPastSixMonths = await Patient.aggregate(
			aggregationPipeline
		).exec();

		/// ECG
		let conditionForEcg = {};
		// console.log(req.role, "req.rolereq.role");
		if (req.role == 1 || req.role == 0) {
			// console.log("condition one ");
			conditionForEcg = {
				patientId: {
					$in: patientIds.map(id => new mongoose.Types.ObjectId(id)),
				},
			};
		} else {
			// console.log("condition two ");
			conditionForEcg = {
				patientId: {
					$in: patientIds.map(id => new mongoose.Types.ObjectId(id)),
				},
			};
		}
		if (req.role == 4) {
			conditionForEcg = {
				patientId: new mongoose.Types.ObjectId(req.userId),
			};
		}

		const ecgCountPastWeek = await Ecg.countDocuments({
			...conditionForEcg,
			createdAt: {
				$gte: startOfWeek,
				$lte: currentDate, // Up to the current date
			},
		}).exec();
		//add condition for patient dashboard
		let matchForEcg = {
			patientId: {
				$in: patientIds.map(id => new mongoose.Types.ObjectId(id)),
			},
		};

		if (req.userId) {
			// console.log("condition 11111111111");
			matchForEcg = {
				patientId: new mongoose.Types.ObjectId(req.userId),
			};
		} else {
			// console.log("condition 222222222");
			// console.log(patientIds.length, "patientIds.length ");
			matchForEcg = {
				patientId: {
					$in: patientIds.map(id => new mongoose.Types.ObjectId(id)),
				},
			};
		}
		// console.log(JSON.stringify(matchForEcg, null, 2));
		let aggregationPipelineForEcg = [
			{
				$match: {
					createdAt: {
						$gte: sixMonthsAgo,
						$lte: currentDate,
					},
					// Add any additional conditions here if needed
				},
			},

			{
				$match: matchForEcg,
			},
			{
				$group: {
					_id: {
						year: { $year: "$createdAt" }, // Extract the year from the date field
						month: { $month: "$createdAt" }, // Extract the month from the date field
					},
					count: { $sum: 1 }, // Count the number of documents for each group
				},
			},
			{
				$sort: {
					"_id.year": 1, // Sort by year in ascending order
					"_id.month": 1, // Then sort by month in ascending order
				},
			},
		];
		const ecgCountPastSixMonths = await Ecg.aggregate(
			aggregationPipelineForEcg
		).exec();
		// console.log(ecgCountPastSixMonths, "ecgCountPastSixMonths");
		const ecgTotalCount = await Ecg.countDocuments({
			...conditionForEcg,
		}).exec();
		// console.log(ecgTotalCount, "ecgTotalCount");
		const ecgCountPastMonth = await Ecg.countDocuments({
			...conditionForEcg,
			createdAt: {
				$gte: startOfMonth,
				$lte: currentDate,
			},
		}).exec();
		// console.log(ecgCountPastMonth, "ecgCountPastMonth");

		const ecgCountPast24Hours = await Ecg.countDocuments({
			...conditionForEcg,
			createdAt: {
				$gte: startOf24Hours,
				$lte: currentDateForHour, // Up to the current date
			},
		}).exec();

		if (req.role == 0) {
			resData.vendorTotalCount = vendorTotalCount;
			resData.vendorCountPastMonth = vendorCountPastMonth;
			resData.vendorCountPastSixMonths = vendorCountPastSixMonths;
			resData.customerTotalCount = customerTotalCount;
			resData.customerCountPastWeek = customerCountPastWeek;
			resData.customerCountPast24Hours = customerCountPast24Hours;
			resData.customerCountPastMonth = customerCountPastMonth;
			resData.customerCountPastSixMonths = customerCountPastSixMonths;
			resData.patientTotalCount = patientDetails.length;
			resData.patientCountPastMonth = patientCountPastMonth;
			resData.patientCountPast24Hours = patientCountPast24Hours;
			resData.patientCountPastWeek = patientCountPastWeek;
			resData.ecgCountPastWeek = ecgCountPastWeek;
			resData.ecgTotalCount = ecgTotalCount;
			resData.ecgCountPast24Hours = ecgCountPast24Hours;
			resData.patientCountPastSixMonths = patientCountPastSixMonths;
			resData.ecgCountPastSixMonths = ecgCountPastSixMonths;
			resData.ecgCountPastMonth = ecgCountPastMonth;
		} else if (req.role == 2) {
			resData.customerCountPastMonth = customerCountPastMonth;
			resData.customerTotalCount = customerTotalCount;
			resData.customerCountPastWeek = customerCountPastWeek;
			resData.customerCountPast24Hours = customerCountPast24Hours;
			resData.customerCountPastSixMonths = customerCountPastSixMonths;
			resData.patientTotalCount = patientDetails.length;
			resData.patientCountPastMonth = patientCountPastMonth;
			resData.patientCountPast24Hours = patientCountPast24Hours;
			resData.patientCountPastWeek = patientCountPastWeek;
			resData.ecgCountPastWeek = ecgCountPastWeek;
			resData.ecgTotalCount = ecgTotalCount;
			resData.ecgCountPast24Hours = ecgCountPast24Hours;
			resData.patientCountPastSixMonths = patientCountPastSixMonths;
			resData.ecgCountPastSixMonths = ecgCountPastSixMonths;
			resData.ecgCountPastMonth = ecgCountPastMonth;
		} else if (req.role == 3) {
			resData.patientTotalCount = patientDetails.length;
			resData.patientCountPastMonth = patientCountPastMonth;
			resData.patientCountPast24Hours = patientCountPast24Hours;
			resData.patientCountPastWeek = patientCountPastWeek;
			resData.ecgCountPastWeek = ecgCountPastWeek;
			resData.ecgTotalCount = ecgTotalCount;
			resData.ecgCountPast24Hours = ecgCountPast24Hours;
			resData.patientCountPastSixMonths = patientCountPastSixMonths;
			resData.ecgCountPastSixMonths = ecgCountPastSixMonths;
			resData.ecgCountPastMonth = ecgCountPastMonth;
		}
		if (req.role == 4) {
			resData.ecgCountPastSixMonths = ecgCountPastSixMonths;
			resData.ecgTotalCount = ecgTotalCount;
			resData.ecgCountPast24Hours = ecgCountPast24Hours;
			resData.ecgCountPastMonth = ecgCountPastMonth;
		}

		//customer ranking data on dashboard
		let matchForRanking = { isDeleted: false };
		if (req.role == 2) {
			matchForRanking = {
				isDeleted: false,
				vendorId: new mongoose.Types.ObjectId(req.vendorId),
			};
		} else {
			matchForRanking = {
				isDeleted: false,
			};
		}

		console.log(matchForRanking, "matchForRanking");
		let pipeline = [
			{
				$match: matchForRanking,
			},
			{
				$graphLookup: {
					from: "patients",
					startWith: "$_id",
					connectFromField: "_id",
					connectToField: "customerId",
					as: "patient",
					restrictSearchWithMatch: {},
				},
			},
			{
				$graphLookup: {
					from: "ecgScans",
					startWith: "$patient._id",
					connectFromField: "patient._id",
					connectToField: "patientId",
					as: "ecgScans",
				},
			},
			{
				$addFields: {
					ecgCount: { $size: "$ecgScans" }, // Count of ECGs
					totalUser: { $size: "$patient" }, // Count of Patients
				},
			},
			{
				$sort: { ecgCount: -1 }, // Sort by ECG count in descending order
			},
			{
				$group: {
					_id: "$_id",
					name: { $first: "$name" },
					ecgCount: { $first: "$ecgCount" }, // Get the first ECG count
					totalUser: { $first: "$totalUser" }, // Get the first patient count
				},
			},
			{
				$sort: { totalUser: -1, ecgCount: -1 }, // Sort by ECG count in descending order
			},
			{
				$project: {
					name: 1,
					ecgCount: 1,
					totalUser: 1,
				},
			},
			{
				$limit: 10, // Limit to six records
			},
		];

		// Your modified aggregation pipeline with a limit of 6 records

		let customerRanking = await Customer.aggregate(pipeline);
		resData.customerRanking = customerRanking;
		if (req.userId) {
			delete resData.customerRanking;
		}
		return response.successResponseWithData(res, 200, resData);
	} catch (err) {
		return response.errorMsgResponse(
			res,
			500,
			err.message || "Some error occurred while get the Dashboard."
		);
	}
};


//forget password
exports.forgetPassword = async (req, res) => {
	const email = req.body.email;
	try {
		let passSendInMail;
		const adminUser = await Admin.findOne({
			email: email,
			isDeleted: false,
		}).exec();
		const vendorUser = await Vendor.findOne({
			email: email,
			isDeleted: false,
		}).exec();
		const customerUser = await Customer.findOne({
			email: email,
			isDeleted: false,
		}).exec();
		const patientUser = await Patient.findOne({
			email: email,
			isDeleted: false,
		}).exec();

		// Check if any of the user variables are not null
		if (adminUser) {
			user = adminUser;
			type = "Admin";
		} else if (vendorUser) {
			user = vendorUser;
			type = "Vendor";
		} else if (customerUser) {
			user = customerUser;
			type = "Customer";
		} else if (patientUser) {
			user = patientUser;
			type = "Customer";
		} else {
			return response.errorMsgResponse(
				res,
				400,
				MESSAGE.ACCOUNT_NOT_REGISTERED
			);
		}
		console.log(user, "user");
		let createRandomString = await common.generateRandomString();
		passSendInMail = createRandomString;
		console.log(createRandomString, "createRandomString");
		let condition = { email: email, isDeleted: false };
		let password = await bcrypt.hash(createRandomString, 10);
		let postData = {
			$set: {
				password: password,
				// decryptPassword: createRandomString,
				isTempPassword: true,
			},
		};
		//user update with password
		let userUpdate;
		if (adminUser) {
			userUpdate = await Admin.findOneAndUpdate(condition, postData, {
				new: true,
			}).exec();
		} else if (vendorUser) {
			userUpdate = await Vendor.findOneAndUpdate(condition, postData, {
				new: true,
			}).exec();
		} else if (customerUser) {
			userUpdate = await Customer.findOneAndUpdate(condition, postData, {
				new: true,
			}).exec();
		} else if (patientUser) {
			userUpdate = await Patient.findOneAndUpdate(condition, postData, {
				new: true,
			}).exec();
		} else {
			return response.errorMsgResponse(
				res,
				400,
				MESSAGE.ACCOUNT_NOT_REGISTERED
			);
		}
		let data = {};
		if (adminUser || customerUser || patientUser) {
			data.fullName = userUpdate.name;
		} else if (vendorUser) {
			data.fullName = userUpdate.companyName;
		} else {
			data.fullName = "User";
		}

		data.email = userUpdate.email;

		data.password = passSendInMail;

		let subject;
		const from = "<contact@kaily.kr>";
		const to = userUpdate.email;
		const bcc = config.sendRestEmailBcc;
		let message;

		if (req.body.language == "ko") {
			message = await templates.forgetPasswordTemplate_ko(data);
			subject = MESSAGE.FORGETPASS_PASSWORD_KO;
		} else {
			message = await templates.forgetPasswordTemplate_en(data);
			subject = MESSAGE.FORGETPASS_PASSWORD;
		}

		await mail.mailfunction(from, to, bcc, subject, message);
		return response.successResponse(res, 200);
		console.log(passSendInMail, "passSendInMail");
	} catch (err) {
		return response.errorMsgResponse(
			res,
			500,
			err.message || "Some error occurred while forget password."
		);
	}
};

exports.changePassword = async (req, res) => {
	try {
		let user;

		const adminUser = await Admin.findOne({
			_id: new mongoose.Types.ObjectId(req.id),
			isDeleted: false,
		}).exec();
		const vendorUser = await Vendor.findOne({
			_id: new mongoose.Types.ObjectId(req.id),
			isDeleted: false,
		}).exec();

		const customerUser = await Customer.findOne({
			_id: new mongoose.Types.ObjectId(req.id),
			isDeleted: false,
		}).exec();

		// Check if any of the user variables are not null
		if (adminUser) {
			user = adminUser;
		} else if (vendorUser) {
			user = vendorUser;
		} else if (customerUser) {
			user = customerUser;
		}
		console.log(user, "user");

		if (req.body.oldPassword) {
			const isEqual = await bcrypt.compare(
				req.body.oldPassword,
				user.password
			);
			if (!isEqual) {
				return response.errorMsgResponse(
					res,
					200,
					MESSAGE.VALIDATE_OLD_PASSWORD
				);
			}
		}
		console.log(
			req.body.oldPassword != req.body.newPassword,
			"req.body.oldPassword != req.body.newPassword"
		);
		if (req.body.oldPassword == req.body.newPassword) {
			return response.errorMsgResponse(res, 200, MESSAGE.OLD_NEW_PASSWORD);
		}
		let condition = { _id: req.id };
		// Bcrypt the new password
		let password = await bcrypt.hash(req.body.newPassword, 10);
		let postData = {
			$set: {
				password: password,
				isTempPassword: false,
			},
		};
		// Update the password

		if (adminUser) {
			let userUpdate = await Admin.findOneAndUpdate(condition, postData, {
				new: true,
			}).exec();
		} else if (vendorUser) {
			let userUpdate = await Vendor.findOneAndUpdate(condition, postData, {
				new: true,
			}).exec();
		} else if (customerUser) {
			let userUpdate = await Customer.findOneAndUpdate(condition, postData, {
				new: true,
			}).exec();
		}

		return response.successResponse(res, 200, MESSAGE.PASSWORD_CHANGED);
	} catch (err) {
		console.log(err, "Error");
		return response.errorMsgResponse(
			res,
			500,
			err.message || "Some error occurred while changing the password."
		);
	}
};
