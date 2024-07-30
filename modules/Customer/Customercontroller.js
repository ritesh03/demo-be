const MESSAGE = require("../../constant/message.json");
const Customer = require("../Customer/Customermodel");
const Patient = require("../Patient/Patientmodel");
const Bucket = require("../Bucket/Bucketmodel");
const bcrypt = require("bcryptjs");
const ExcelJS = require("exceljs");
const timestamp = new Date().toLocaleString();
const path = require("path");
const common = require("../../middleware/common");
const templates = require("../../emailTemplate/templates");
const moment = require("moment");
const mail = require("../../middleware/mail");
const response = require("../../helper/response");
const { matchedData, validationResult } = require("express-validator");
const {
	getPagination,
	Failures,
	getCapitalizeString,
} = require("../../middleware/common");
// const config = require("../../config/auth.config");
const fs = require("fs");

// date define for last week data
const date = new Date();
const millisecondsSinceEpoch = date.getTime();
const durationToSubtractForweekCount = 7 * 24 * 60 * 60 * 1000;
const resultMilliseconds =
	millisecondsSinceEpoch - durationToSubtractForweekCount;
const resultDate = new Date(resultMilliseconds);
const resultISODate = resultDate.toISOString();
const mongoose = require("mongoose");
const config = require("../../config/auth.config");

// Create and Save a new customer
exports.create = async (req, res) => {
	console.log("create customer");
	let passSendInMail;
	let DataSend = {};
	let bucketData = {};
	const postData = req.body;

	try {
		// Validate request
		const errors = validationResult(req).formatWith(Failures);
		if (!errors.isEmpty()) {
			return res.status(422).json({ errors: errors.array() });
		}
		//check customer email address
		let customer = await Customer.findOne({
			email: postData.email,
			isDeleted: false,
		}).exec();
		if (customer) {
			return response.errorMsgResponse(res, 200, MESSAGE.ALREADY_RECORD);
		}

		//check customer number
		let checkNumber = await Customer.findOne({
			countryCode: postData.countryCode,
			phoneNumber: postData.phoneNumber,
			isDeleted: false,
		}).exec();
		if (checkNumber) {
			return response.errorMsgResponse(
				res,
				200,
				MESSAGE.PHONE_ALREADY_EXISTS
			);
		}

		passSendInMail = postData.password;
		//bcrypt password
		let password;
		if (postData.password) {
			password = await bcrypt.hash(postData.password, 10);
		} else {
			return response.errorMsgResponse(res, 200, MESSAGE.FAILED);
		}

		// postData.decryptPassword = postData.password;
		postData.password = password;
		//generate unique code for reference (referral code)
		let uniqueCode = common.generateUniqueRandomString();
		postData.uniqueCode = uniqueCode;
		//add id who is adding customer
		if (req.adminId) {
			postData.adminId = req.adminId;
		}
		if (req.vendorId) {
			postData.vendorId = req.vendorId;
		}

		
		postData.profileImage = postData.profileImage ? postData.profileImage : ""
	
		//check for bucket create
		if (postData.uniqueCode) {
			// const lowercaseString = postData.uniqueCode.toLowerCase();
			// const createBucket = await common.createBucket(lowercaseString);
			// postData.bucketName = lowercaseString;
			// if (!createBucket && createBucket == "undefined") {
			// return response.errorMsgResponse(
			// res,
			// 200,
			// MESSAGE.INVALID_BUCKET_NAME
			// );
			// }

			// Create Bucket on AWS
			// const lowercaseString =
			// 	config.envBucket == "dev"
			// 		? `${config.envBucket}-${postData.uniqueCode.toLowerCase()}`
			// 		: postData.uniqueCode.toLowerCase();

			// const createBucket = await common.createBucket(lowercaseString);

			const bucket_name =
				config.envBucket == "dev"
					? "dev-myhealtharchive"
					: "myhealtharchive";
			const lowercaseString =
				config.envBucket == "dev"
					? `${config.envBucket}-${postData.uniqueCode.toLowerCase()}`
					: postData.uniqueCode.toLowerCase();
			const createBucket = await common.createBucketFolder(
				bucket_name,
				lowercaseString,
				2
			);

			postData.bucketName = bucket_name;
			postData.folderName = lowercaseString;

			bucketData.type = 2;
			bucketData.bucketName = bucket_name;
			bucketData.folderName = lowercaseString;
			console.log(createBucket, "createBucketcreateBucketcreateBucket");
			if (createBucket == undefined) {
				return response.errorMsgResponse(
					res,
					200,
					MESSAGE.INVALID_BUCKET_NAME
				);
			}

			// Create IAM User on AWS
			// let customerName = postData.name.replace(/\s/g, '')
			// let AWSUsername = customerName+"-"+lowercaseString
			// let AWSBucket  =  lowercaseString
			// let AWSPassword = customerName+'@123';
			// const createIAM = await common.createIAMUser(AWSBucket,AWSUsername,AWSPassword);
			// if (createIAM == undefined) {
			// return response.errorMsgResponse(
			// res,
			// 200,
			// "ERROR WHILE IAM USER"
			// );
			// }

			// DataSend.AWSLink = `https://s3.console.aws.amazon.com/s3/buckets/${AWSBucket}?region=ap-northeast-2&tab=objects`
			// DataSend.AWSAccountId = 400738898206;
			// DataSend.AWSUsername = AWSUsername
			// DataSend.AWSPassword = AWSPassword

			// bucketData.type  = 2
			// bucketData.link  = DataSend.AWSLink
			// bucketData.accountId = DataSend.AWSAccountId
			// bucketData.username  = DataSend.AWSUsername
			// bucketData.password  = DataSend.AWSPassword
			// bucketData.bucketName  = AWSBucket
		}
		let data = await Customer.create(postData);

		bucketData.customerId = data._id;
		if (req.vendorId) {
			bucketData.vendorId = req.vendorId;
		}

		console.log(" REsult bucketData Data ");
		console.log(bucketData);
		await Bucket.create(bucketData);

		DataSend.supportEmail = config.supportEmail;
		DataSend.email = data.email;
		DataSend.name = data.name;
		DataSend.password = passSendInMail;

		// Send email to customer
		let subject;
		const from = "synex<contact@kaily.kr>";
		const to = data.email;
		const bcc = config.sendRestEmailBcc;

		console.log(data);
		let message;

		if (postData.language == "ko") {
			message = await templates.addVendorTemplate_ko(DataSend);
			subject = MESSAGE.ADD_CUSTOMER_KO;
		} else {
			message = await templates.addVendorTemplate_en(DataSend);
			subject = MESSAGE.ADD_CUSTOMER;
		}

		await mail.mailfunction(from, to, bcc, subject, message);
		return response.successResponse(res, 200);
	} catch (err) {
		console.log(err, "errrr");
		return response.errorMsgResponse(
			res,
			500,
			err.message || "Some error occurred while creating the Category."
		);
	}
};
// Update customer
exports.update = async (req, res) => {
	const id = req.params.id;
	const postData = req.body;
	if ((!id && id === undefined) || id === ":id") {
		return res
			.status(200)
			.send({ status: 0, message: "id parameter value is required" });
	}
	//check customer email address
	let customer = await Customer.findOne({
		_id: { $ne: req.params.id },
		email: postData.email,
		isDeleted: false,
	}).exec();
	if (customer) {
		return response.errorMsgResponse(res, 200, MESSAGE.EMAIL_ALREADY_EXISTS);
	}

	//check customer number
	let checkNumber = await Customer.findOne({
		_id: { $ne: req.params.id },
		phoneNumber: postData.phoneNumber,
		isDeleted: false,
	}).exec();
	if (checkNumber) {
		return response.errorMsgResponse(res, 200, MESSAGE.PHONE_ALREADY_EXISTS);
	}
	try {
		let condition = { _id: id };
		if (postData.password) {
			let password = await bcrypt.hash(req.body.password, 10);
			// postData.decryptPassword = postData.password;
			postData.password = password;
		}
		let data = await Customer.findByIdAndUpdate(condition, req.body).exec();
		if (!data) return response.errorMsgResponse(res, 200, MESSAGE.NO_RECORD);

		return response.successResponse(res, 200);
	} catch (err) {
		return response.errorMsgResponse(
			res,
			500,
			err.message || "Some error occurred while update the property."
		);
	}
};

//Get all customers
exports.findAll = async (req, res) => {
	try {
		const { page, size, isGuest, deviceId, search, column, sort,startDate,endDate } = req.query;
		const { limit, offset } = await getPagination(page, size);
		console.log(req.vendorId, "req.vendorId");
		console.log(req.adminId, "req.adminId");
		let match = {};
		if (req.vendorId) {
			match = {
				vendorId: new mongoose.Types.ObjectId(req.vendorId),
				isDeleted: false,
			};
		} else {
			match = { isDeleted: false };
		}

		let pipeline = [
			{
				$match: match,
			},

			{
				$graphLookup: {
					from: "patients",
					startWith: "$_id",
					connectFromField: "_id",
					connectToField: "customerId",
					as: "patient",
					restrictSearchWithMatch: { isDeleted: false },
				},
			},
			{
				$addFields: {
					lastWeekUserCount: {
						$size: {
							$filter: {
								input: "$patient",
								as: "patient",
								cond: {
									$gte: [
										"$$patient.createdAt",
										resultISODate, // Timestamp for one week ago
									],
								},
							},
						},
					},
				},
			},
			{
				$graphLookup: {
					from: "vendors",
					startWith: "$vendorId",
					connectFromField: "vendorId",
					connectToField: "_id",
					as: "vendor",
					restrictSearchWithMatch: { isDeleted: false },
				},
			},
			{
				$unwind: {
					path: "$vendor",
					preserveNullAndEmptyArrays: true,
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
					lastWeekEcgCount: {
						$filter: {
							input: "$ecgScans",
							as: "ecgScansItem",
							cond: {
								$gte: ["$$ecgScansItem.createdAt", resultISODate],
							},
						},
					},
				},
			},
			{
				$addFields: {
					lastWeekEcgCount: {
						$size: {
							$filter: {
								input: "$ecgScans",
								as: "ecgScan",
								cond: {
									$gte: [
										"$$ecgScan.createdAt",
										resultISODate, // Timestamp for one week ago
									],
								},
							},
						},
					},
				},
			},
			{
				$group: {
					_id: "$_id",
					name: { $first: "$name" },
					address: { $first: "$address" },
					profileImage: { $first: { $ifNull: ["$profileImage", ""] } },
					vendor: { $first: "$vendor" },
					createdAt: { $first: "$createdAt" },
					email: { $first: "$email" },
					uniqueCode: { $first: "$uniqueCode" },
					ecgCount: {
						$sum: {
							$cond: {
								if: {
									$gt: [{ $size: { $ifNull: ["$ecgScans", []] } }, 0],
								},
								then: { $size: { $ifNull: ["$ecgScans", []] } },
								else: 0,
							},
						},
					},
					lastWeekEcgCount: { $sum: "$lastWeekEcgCount" },
					lastWeekUserCount: { $sum: "$lastWeekUserCount" },
					totalUser: {
						$sum: {
							$cond: {
								if: {
									$gt: [{ $size: { $ifNull: ["$patient", []] } }, 0],
								},
								then: { $size: { $ifNull: ["$patient", []] } },
								else: 0,
							},
						},
					},
				},
			},

			{
				$sort: { createdAt: -1 }, // Sort by createdAt in descending order before grouping
			},
			{
				$project: {
					name: 1,
					id: 1,
					address: 1,
					profileImage:1,
					"vendor.companyName": 1,
					email: 1,
					uniqueCode:1,
					createdAt: 1,
					totalUser: 1,
					ecgCount: 1,
					lastWeekEcgCount: 1,
					lastWeekUserCount: 1,
				},
			},
		];

		if (search) {
			const escapedSearch = search.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
			pipeline.push({
				$match: {
					$or: [
						{
							name: {
								$regex: escapedSearch,
								$options: "si",
							},
						},
						{
							"vendor.companyName": {
								$regex: escapedSearch,
								$options: "si",
							},
						},
						{
							address: {
								$regex: escapedSearch,
								$options: "si",
							},
						},
					],
				},
			});
		}


		const sendStartDate = `${startDate}T00:00:00.000Z`;
		const StartDateString = new Date(sendStartDate);
		
		const sendEndDate = `${endDate}T23:59:00.000Z`;
		const endDateString = new Date(sendEndDate);
		console.log(StartDateString, "  StartDateString ")
		console.log(endDateString, "  endDateString ")

		const endDateForOneDate = new Date(sendStartDate);
		endDateForOneDate.setDate(endDateForOneDate.getDate() + 1);

		console.log(endDateForOneDate, "  endDateForOneDate ")

		if(startDate && endDate){
			console.log("-------- search b date -----"+startDate)
			pipeline.push({
				$match: {
					"createdAt": {
						$gte:StartDateString,
						$lte:endDateString
					}
				}
			});
			
		} 
		// else if(startDate) {
		// 	console.log("-- ELSE PART--")
		// 	pipeline.push({
		// 		$match: {
		// 			"createdAt": {
		// 				$gte:StartDateString,
		// 				$lt:endDateForOneDate
		// 			}
		// 		}
		// 	});
		// }

		// if(searchByDate){
		// 	console.log("-------- search b date -----"+searchByDate)

		// 	// const finalStartDate = searchByDate;
		// 	const sendStartDate = `${searchByDate}T00:00:00Z`;
		// 	const StartDateString = new Date(sendStartDate);
		// 	console.log(StartDateString, "  StartDateString")
			
		// 	const sendEndDate = `${searchByDate}T23:59:00.000Z`;
		// 	const endDateString = new Date(sendEndDate);
		// 	pipeline.push({
		// 		$match: {
		// 			"createdAt": {
		// 				$gte:StartDateString,
		// 				$lt:endDateString
		// 			}
		// 		}
		// 	});

		// 	console.log(JSON.stringify(pipeline))
		// }

		if (column === "name") {
			console.log(column, "column");
			// Add the $sort stage to sort by companyName in ascending order (1) or descending order (-1)
			pipeline.push({
				$sort: {
					name: sort == -1 ? -1 : 1,
				},
			});
		}
		if (column === "companyName") {
			console.log(column, "column");
			// Add the $sort stage to sort by companyName in ascending order (1) or descending order (-1)
			pipeline.push({
				$sort: {
					"vendor.companyName": sort == -1 ? -1 : 1,
				},
			});
		}
		if (column === "totalUser") {
			console.log(column, "column");
			// Add the $sort stage to sort by companyName in ascending order (1) or descending order (-1)
			pipeline.push({
				$sort: {
					totalUser: sort == -1 ? -1 : 1,
				},
			});
		}
		if (column === "ecgCount") {
			console.log(column, "column");
			// Add the $sort stage to sort by companyName in ascending order (1) or descending order (-1)
			pipeline.push({
				$sort: {
					ecgCount: sort == -1 ? -1 : 1,
				},
			});
		}
		if (column === "lastWeekUserCount") {
			console.log(column, "column");
			// Add the $sort stage to sort by companyName in ascending order (1) or descending order (-1)
			pipeline.push({
				$sort: {
					lastWeekUserCount: sort == -1 ? -1 : 1,
				},
			});
		}
		if (column === "lastWeekEcgCount") {
			console.log(column, "column");
			// Add the $sort stage to sort by companyName in ascending order (1) or descending order (-1)
			pipeline.push({
				$sort: {
					lastWeekEcgCount: sort == -1 ? -1 : 1,
				},
			});
		}

		if (column === "createdAt") {
			console.log(column, "column");
			// Add the $sort stage to sort by companyName in ascending order (1) or descending order (-1)
			pipeline.push({
				$sort: {
					createdAt: sort == -1 ? -1 : 1,
				},
			});
		}


		console.log(JSON.stringify(pipeline))

		let data = {};
		let resultCount = await Customer.aggregate(pipeline);
		console.log(resultCount.length, "resultCount", size);

		data.totalDocs = resultCount.length ? resultCount.length : 0;
		data.totalPages = Math.max(Math.ceil(resultCount.length / size), 1)
			? Math.max(Math.ceil(resultCount.length / size), 1)
			: 0;

		if (page && size) {
			data.page = parseInt(page);
			pipeline.push({
				$skip: (page - 1) * size,
			});
			pipeline.push({
				$limit: parseInt(size),
			});
		}

		let result = await Customer.aggregate(pipeline);
		console.log("result============")
		console.log(result)
		if (result.length) {
			data.docs = result;
		} else {
			data.docs = [];
		}
		return response.successResponseWithPagingData(res, 200, data);
	} catch (err) {
		return res.status(500).send({
			message: err.message || "Some error occurred.",
		});
	}
};
//Get all vendor customers
exports.vendorCustomers = async (req, res) => {
	try {
		console.log(req.query.id);
		let match = { isDeleted: false };

		if (req.query.id) {
			match = {
				vendorId: new mongoose.Types.ObjectId(req.query.id),
				isDeleted: false,
			};
		} else if (req.vendorId) {
			match = {
				vendorId: new mongoose.Types.ObjectId(req.vendorId),
				isDeleted: false,
			};
		} else {
			match = { isDeleted: false };
		}

		console.log(match, "match");
		let pipeline = [
			{
				$match: match,
			},

			{
				$sort: { createdAt: -1 }, // Sort by createdAt in descending order before grouping
			},
			{
				$project: {
					name: 1,
					id: 1,
				},
			},
		];

		let data = {};

		let result = await Customer.aggregate(pipeline);

		if (result.length) {
			data.docs = result;
		} else {
			data.docs = [];
		}
		return response.successResponseWithPagingData(res, 200, data);
	} catch (err) {
		return res.status(500).send({
			message: err.message || "Some error occurred.",
		});
	}
};
//Get Single customer with the specified id in the request
exports.findOne = async (req, res) => {
	try {
		const id = req.params.id;
		if ((!id && id === undefined) || id === ":id") {
			return res
				.status(200)
				.send({ status: 0, message: "id parameter value is required" });
		}

		let condition = { _id: id };
		let data = await Customer.findById(condition).exec();
		console.log(id, "id");
		if (!data) return response.errorMsgResponse(res, 200, MESSAGE.NO_RECORD);

		return response.successResponseWithData(res, 200, data);
	} catch (err) {
		return response.errorMsgResponse(
			res,
			500,
			err.message || "Some error occurred while get the Category."
		);
	}
};

// Delete a Customer  with the specified id in the request
exports.delete = async (req, res) => {
	// Extract the id from request parameters
	const id = req.params.id;
	// Check if id is missing or set to ":id"
	if (!id || id === undefined || id === ":id") {
		return res
			.status(200)
			.send({ status: 0, message: "id parameter value is required" });
	}

	try {
		// Create a condition to find the customer by id
		let condition = { _id: req.params.id };

		// Check if the customer exists
		let data = await Customer.findById(condition).exec();
		console.log(data, "data");
		if (!data) return response.errorMsgResponse(res, 200, MESSAGE.NO_RECORD);

		// Mark the customer as deleted
		condition = { _id: req.params.id };
		await Customer.findByIdAndUpdate(
			condition,
			{ isDeleted: true },
			{ new: true }
		).exec();
		let patient = await Patient.updateMany(
			{
				customerId: new mongoose.Types.ObjectId(req.params.id),
				vendorId: { $exists: false },
			},
			{ $set: { uniqueCode: "" } }
		).exec();

		console.log(patient, "patientpatientpatient");
		// Find patients with referral code associated with the customer
		const patientsWithReferralCode = await Patient.find({
			customerId: new mongoose.Types.ObjectId(req.params.id),
			vendorId: { $ne: null },
		}).populate("vendorId", "uniqueCode");

		// Update patients with the uniqueCode of their associated vendorId
		const updatePromises = patientsWithReferralCode.map(async patient => {
			if (patient.vendorId) {
				// Update the patient's uniqueCode with the vendorId's uniqueCode
				await Patient.updateOne(
					{ _id: patient._id },
					{ $set: { uniqueCode: patient.vendorId.uniqueCode } }
				);
			}
		});

		// Wait for all update operations to complete
		await Promise.all(updatePromises);

		// Reset uniqueCode for patients without a vendorId
		await Patient.findOneAndUpdate(
			{
				customerId: new mongoose.Types.ObjectId(req.params.id),
				$or: [
					{ vendorId: { $exists: false } },
					{ vendorId: { $eq: null } },
				],
			},
			{ $set: { uniqueCode: "" } },
			{ new: true, lean: true }
		).exec();

		// Unset customerId for all patients associated with the customer
		await Patient.updateMany(
			{ customerId: new mongoose.Types.ObjectId(req.params.id) },
			{ $unset: { customerId: "" } }
		).exec();

		await Patient.updateMany(
			{
				customerId: new mongoose.Types.ObjectId(req.params.id),
				vendorId: { $ne: null },
			},
			{ $set: { uniqueCode: "" } }
		).exec();
		return response.successResponse(res, 200);
	} catch (err) {
		return response.errorMsgResponse(
			res,
			500,
			err.message || "Some error occurred while delete the Property."
		);
	}
};
// Block a Customer with the specified id in the request
exports.block = async (req, res) => {
	const id = req.params.id;
	if ((!id && id === undefined) || id === ":id") {
		return res
			.status(200)
			.send({ status: 0, message: "id parameter value is required" });
	}

	// Validate request
	const errors = validationResult(req).formatWith(Failures);
	if (!errors.isEmpty()) {
		return res.status(422).json({ errors: errors.array() });
	}

	const postData = matchedData(req);

	try {
		let condition = { _id: req.params.id };
		let data = await Customer.findById(condition).exec();
		if (!data) {
			return response.errorMsgResponse(res, 200, MESSAGE.NO_RECORD);
		}
		const isBlocked = postData.isBlocked;
		await Customer.findByIdAndUpdate(condition, {
			isBlocked: isBlocked,
		}).exec();
		return response.successResponse(res, 200);
	} catch (err) {
		return response.errorMsgResponse(
			res,
			500,
			err.message || "Some error occurred while Property block."
		);
	}
};
exports.excelSheet = async (req, res) => {
	try {
		const {lang} = req.query
		let match = {};
		if (req.vendorId) {
			match = {
				vendorId: new mongoose.Types.ObjectId(req.vendorId),
				isDeleted: false,
			};
		} else {
			match = { isDeleted: false };
		}
		let pipeline = [
			{
				$match: match,
			},

			{
				$graphLookup: {
					from: "patients",
					startWith: "$_id",
					connectFromField: "_id",
					connectToField: "customerId",
					as: "patient",
					restrictSearchWithMatch: { isDeleted: false },
				},
			},
			{
				$addFields: {
					lastWeekUserCount: {
						$size: {
							$filter: {
								input: "$patient",
								as: "patient",
								cond: {
									$gte: [
										"$$patient.createdAt",
										resultISODate, // Timestamp for one week ago
									],
								},
							},
						},
					},
				},
			},
			{
				$graphLookup: {
					from: "vendors",
					startWith: "$vendorId",
					connectFromField: "vendorId",
					connectToField: "_id",
					as: "vendor",
					restrictSearchWithMatch: { isDeleted: false },
				},
			},
			{
				$unwind: {
					path: "$vendor",
					preserveNullAndEmptyArrays: true,
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
					lastWeekEcgCount: {
						$filter: {
							input: "$ecgScans",
							as: "ecgScansItem",
							cond: {
								$gte: ["$$ecgScansItem.createdAt", resultISODate],
							},
						},
					},
				},
			},
			{
				$addFields: {
					lastWeekEcgCount: {
						$size: {
							$filter: {
								input: "$ecgScans",
								as: "ecgScan",
								cond: {
									$gte: [
										"$$ecgScan.createdAt",
										resultISODate, // Timestamp for one week ago
									],
								},
							},
						},
					},
				},
			},
			{
				$group: {
					_id: "$_id",
					name: { $first: "$name" },
					address: { $first: "$address" },
					vendor: { $first: "$vendor" },
					createdAt: { $first: "$createdAt" },
					email: { $first: "$email" },
					ecgCount: {
						$sum: {
							$cond: {
								if: {
									$gt: [{ $size: { $ifNull: ["$ecgScans", []] } }, 0],
								},
								then: { $size: { $ifNull: ["$ecgScans", []] } },
								else: 0,
							},
						},
					},
					lastWeekEcgCount: { $sum: "$lastWeekEcgCount" },
					lastWeekUserCount: { $sum: "$lastWeekUserCount" },
					totalUser: {
						$sum: {
							$cond: {
								if: {
									$gt: [{ $size: { $ifNull: ["$patient", []] } }, 0],
								},
								then: { $size: { $ifNull: ["$patient", []] } },
								else: 0,
							},
						},
					},
				},
			},

			{
				$sort: { createdAt: -1 }, // Sort by createdAt in descending order before grouping
			},
			{
				$project: {
					name: 1,
					id: 1,
					address: 1,
					"vendor.companyName": 1,
					email: 1,
					createdAt: 1,
					totalUser: 1,
					ecgCount: 1,
					lastWeekEcgCount: 1,
					lastWeekUserCount: 1,
				},
			},
		];

		let result = await Customer.aggregate(pipeline);
		// console.log(result, "result");

		// Create a new workbook and add a worksheet
		let wb = new ExcelJS.Workbook();
		let options = {
			margins: {
				left: 0.75,
				right: 0.75,
				top: 1.0,
				bottom: 1.0,
				footer: 0.5,
				header: 0.5,
			},
			printOptions: {
				centerHorizontal: true,
				centerVertical: false,
			},
			paperDimensions: {
				paperWidth: "210mm",
				paperHeight: "297mm",
			},
			view: {
				zoom: 100,
			},
			outline: {
				summaryBelow: true,
			},
			fitToPage: {
				fitToHeight: 100,
				orientation: "landscape",
			},
		};
		let ws = wb.addWorksheet("Customer Data", options);

		let headers = [
			"Name",
			"Address",
			"Vendor Name",
			"Email",
			"Total Users",
			"Total Electrocardiogram",
			"Last Week Total Electrocardiogram",
			"Last Week Total User",
			"Created At",
		];

		if(lang==="ko"){
            headers = [
				"고객사 이름",
                "주소",
                "대리점",
                "이메일",
                "수진자 합계",
                "심전도 합계",
                "심전도 수 (최근 1주일)",
                "사용자 수 (최근 1주일)",
                "생성 날짜",
			];
        }

		const headerRow = ws.getRow(1);
		headers.forEach((header, index) => {
			headerRow.getCell(index + 1).value = header;

			// Set cell formatting for headers (e.g., bold text, background color, etc.)
			headerRow.getCell(index + 1).font = { bold: true }; // Make text bold
			headerRow.getCell(index + 1).fill = {
				type: "pattern",
				pattern: "solid",
				fgColor: { argb: "FFFF00" }, // Yellow background color
			};
		});
		ws.getColumn(1).width = 20;
		ws.getColumn(2).width = 30;
		ws.getColumn(3).width = 20;
		ws.getColumn(4).width = 20;
		ws.getColumn(5).width = 20;
		ws.getColumn(6).width = 20;
		ws.getColumn(7).width = 25;

		// First TAB

		result.forEach((customer, index) => {
			// Assuming you want to start populating data from row 4 (row 1 is for headers)
			console.log(index, "index");
			const rowIndex = index + 2;

			// Populate data in each column
			ws.getCell(rowIndex, 1).value = customer.name ? customer.name : "-";
			ws.getCell(rowIndex, 2).value = customer.address
				? customer.address
				: "-";
			if (customer.vendor) {
				ws.getCell(rowIndex, 3).value = customer.vendor.companyName
					? customer.vendor.companyName
					: "-";
			}
			ws.getCell(rowIndex, 4).value = customer.email ? customer.email : "-";
			ws.getCell(rowIndex, 5).value = customer.totalUser
				? customer.totalUser
				: "-";
			ws.getCell(rowIndex, 6).value = customer.ecgCount
				? customer.ecgCount
				: "-";
			ws.getCell(rowIndex, 7).value = customer.lastWeekEcgCount
				? customer.lastWeekEcgCount
				: "-";
			ws.getCell(rowIndex, 8).value = customer.lastWeekUserCount
				? customer.lastWeekUserCount
				: "-";
			ws.getCell(rowIndex, 9).value = moment(customer.createdAt).format(
				"YYYY-MM-DD"
			)
				? moment(customer.createdAt).format("YYYY-MM-DD")
				: "-";

			// Add more columns as needed

			// Set cell formatting and borders for each cell as per your requirements
			// For example:
			ws.getCell(rowIndex, 1).alignment = {
				horizontal: "left", // Adjust alignment as needed
			};
			ws.getCell(rowIndex, 1).border = {
				style: "thin",
				color: { argb: "000000" },
			};
			// Repeat the formatting for other cells as needed
		});

		const sanitizedTimestamp = timestamp.replace(/[/\s,:]/g, "_");
		let fname = lang === "ko" ? "_고객" : "_Customer"
		let filename = `${sanitizedTimestamp}${fname}.xlsx`; // Include the filename here
		const filePath = path.join(__dirname, "../../../uploads/", filename); // Add a "/" after "uploads"
		console.log(filePath, "filePathfilePath");
		// Write the Excel file
		await wb.xlsx.writeFile(filePath);
		// Construct the redirect URL
		let resData = {};
		filename = config.adminUrl + `${sanitizedTimestamp}${fname}.xlsx`; // Include the filename here
		resData.url = filename;
		return response.successResponseWithData(res, 200, resData);
	} catch (err) {
		console.log(err, "err");
		return response.errorMsgResponse(
			res,
			500,
			err.message || "Some error occurred while Property block."
		);
	}
};


// Upload IMAGE
exports.uploadImage = async (req, res) => {
	console.log("create uploadImage");
	let passSendInMail;
	let DataSend = {};
	let bucketData = {};
	const postData = req.body;

	try {
		// Validate request
		// const errors = validationResult(req).formatWith(Failures);
		// if (!errors.isEmpty()) {
		// 	return res.status(422).json({ errors: errors.array() });
		// }

		// BUCKET_NAME = 'dev-myhealtharchive'	;		
		FOLDER_NAME = "customer/profileImage"
		let pdfFileName = req.files["image"][0].filename;
		let pdfFilePath = req.files["image"][0].path;
		let contentType = req.files["image"][0].mimetype
	
		let data = await uploadFileOnS3Bucket(
			FOLDER_NAME,
			pdfFilePath,
			pdfFileName,
			contentType,
			"png"
		);

		console.log(data , " pdfUrl")

		return response.successResponseWithData(res, 200, data);
	} catch (err) {
		console.log(err, "errrr");
		return response.errorMsgResponse(
			res,
			500,
			err.message || "Some error occurred while creating the Category."
		);
	}
};

async function uploadFileOnS3Bucket(
	FOLDER_NAME,	
	filePath,
	fileName,
	contentType,
	type
) {
	console.log(" ++++++++++ ENTER S3 BUCKET FUNCTION ++++++++++++++++");
	console.log(" filePath " + filePath);
	console.log(" fileName " + fileName);
	console.log(" config.envBucket " + config.envBucket);

	const bucket_name =	config.envBucket == "dev" ? "dev-myhealtharchive" : "myhealtharchive";
	console.log(bucket_name, " bucket_name")
	key = FOLDER_NAME +"/"+ fileName;

	const fileData = fs.readFileSync(filePath);
	let params2 = {
		Bucket: bucket_name,
		Key: key,
		Body: fileData,
		ContentType: contentType,
	};

	try {
		const stored1 = await s3.upload(params2).promise();
		// console.log(stored1);
		return stored1;
	} catch (err) {
		console.log(err);
	}
}