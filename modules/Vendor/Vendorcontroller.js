const MESSAGE = require("../../constant/message.json");
const Vendor = require("../Vendor/Vendormodel");
const Bucket = require("../Bucket/Bucketmodel");
const Patient = require("../Patient/Patientmodel");
const fs = require("fs");
const ExcelJS = require("exceljs");
const bcrypt = require("bcryptjs");
const moment = require("moment");
const timestamp = new Date().toLocaleString();
const path = require("path");
const common = require("../../middleware/common");
const templates = require("../../emailTemplate/templates");
const mail = require("../../middleware/mail");
const response = require("../../helper/response");
const { matchedData, validationResult } = require("express-validator");
const {
	getPagination,
	Failures,
	getCapitalizeString,
} = require("../../middleware/common");

const mongoose = require("mongoose");
const config = require("../../config/auth.config");

// Create and Save a new vendor
exports.create = async (req, res) => {
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
		//check vendor email address
		let vendor = await Vendor.findOne({
			email: postData.email,
			isDeleted: false,
		}).exec();
		if (vendor) {
			return response.errorMsgResponse(
				res,
				200,
				MESSAGE.EMAIL_ALREADY_EXISTS
			);
		}

		//check vendor number
		let checkNumber = await Vendor.findOne({
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

		//create 8 digit alpha numeric password for vendor
		// let createRandomString = await common.generateRandomString();
		passSendInMail = postData.password;

		console.log(passSendInMail);
		let password = await bcrypt.hash(postData.password, 10);

		// create unique code for vendor
		let uniqueCode = common.generateUniqueRandomString();

		postData.adminId = req.userId;
		postData.uniqueCode = uniqueCode;
		// postData.decryptPassword = postData.password;
		postData.password = password;

		//check for bucket create

		if (postData.uniqueCode) {
			// Create Bucket on AWS
			// if(config.envBucket != ''){
			// 	const lowercaseString = config.envBucket+"-"+postData.uniqueCode.toLowerCase();
			// } else {
			// 	const lowercaseString = postData.uniqueCode.toLowerCase();
			// }

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
				1
			);

			postData.bucketName = bucket_name;
			postData.folderName = lowercaseString;

			bucketData.type = 1;
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
			// let companyName = postData.companyName.replace(/\s/g, '')
			// let AWSUsername = companyName+"-"+lowercaseString
			// let AWSPassword = companyName+'@123';
			// let AWSBucket  =  lowercaseString
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

			// bucketData.type  = 1
			// bucketData.bucketName  = AWSBucket
			// bucketData.link  = DataSend.AWSLink
			// bucketData.accountId = DataSend.AWSAccountId
			// bucketData.username  = DataSend.AWSUsername
			// bucketData.password  = DataSend.AWSPassword
		}

		let data = await Vendor.create(postData);

		console.log(" REsult Vendor Data ");
		console.log(data);

		console.log(" REsult bucketData Data ");
		console.log(bucketData);
		bucketData.vendorId = data._id;
		await Bucket.create(bucketData);

		DataSend.supportEmail = config.supportEmail;
		DataSend.email = data.email;

		DataSend.name = data.companyName;
		DataSend.password = passSendInMail;

		console.log(DataSend);

		// Send email to vendor
		let subject;
		const from = "";
		const to = data.email;
		const bcc = config.sendRestEmailBcc;

		console.log(data);
		let message;
		if (postData.language == "ko") {
			message = await templates.addVendorTemplate_ko(DataSend);
			subject = MESSAGE.ADD_VENDOR_KO;
		} else {
			message = await templates.addVendorTemplate_en(DataSend);
			subject = MESSAGE.ADD_VENDOR;
		}

		await mail.mailfunction(from, to, bcc, subject, message);

		return response.successResponse(res, 200);
	} catch (err) {
		return response.errorMsgResponse(
			res,
			500,
			err.message || "Some error occurred while creating the Category."
		);
	}
};
// Update vendor
exports.update = async (req, res) => {
	const id = req.params.id;
	const postData = req.body;
	if ((!id && id === undefined) || id === ":id") {
		return res
			.status(200)
			.send({ status: 0, message: "id parameter value is required" });
	}

	try {
		// Validate request
		const errors = validationResult(req).formatWith(Failures);
		if (!errors.isEmpty()) {
			return res.status(422).json({ errors: errors.array() });
		}
		//check vendor duplicate email

		let vendor = await Vendor.findOne({
			_id: { $ne: req.params.id },
			email: req.body.email,
			isDeleted: false,
		}).exec();
		if (vendor) {
			return response.errorMsgResponse(
				res,
				200,
				MESSAGE.EMAIL_ALREADY_EXISTS
			);
		}

		//check vendor duplicate number
		let checkNumber = await Vendor.findOne({
			_id: { $ne: req.params.id },
			phoneNumber: req.body.phoneNumber,
			isDeleted: false,
		}).exec();
		if (checkNumber) {
			return response.errorMsgResponse(
				res,
				200,
				MESSAGE.PHONE_ALREADY_EXISTS
			);
		}
		let condition = { _id: id };
		// update password in vendor
		if (postData.password) {
			let password = await bcrypt.hash(req.body.password, 10);

			postData.password = password;
		}
		// update vendor
		let data = await Vendor.findByIdAndUpdate(condition, postData).exec();

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

// //Get all vendors
// exports.findAll = async (req, res) => {
// 	try {
// 		const { page, size, search, id } = req.query;
// 		const { limit, offset } = await getPagination(page, size);

// 		let query = { isDeleted: false };
// 		if (search) {
// 			query = {
// 				$or: [{ companyName: new RegExp(search, "i") }],
// 			};
// 		}
// 		if (id) query._id = new mongoose.Types.ObjectId(id);

// 		query.isDeleted = false;

// 		let options = {
// 			sort: { createdAt: -1 },
// 			strictPopulate: false,
// 			lean: true,
// 			offset: offset,
// 			limit: limit,
// 			projection: {
// 				companyName: 1,
// 				address: 1,
// 				managerName: 1,
// 				phoneNumber: 1,
// 				isBlocked: 1,
// 				countryCode: 1,
// 				uniqueCode: 1,
// 				address: 1,
// 			},
// 		};

// 		let data = await Vendor.paginate(query, options);

// 		if (data.length === 0) {
// 			return response.errorMsgResponse(res, 200, MESSAGE.NO_RECORD);
// 		}

// 		return response.successResponseWithPagingData(res, 200, data);
// 	} catch (err) {
// 		return res.status(500).send({
// 			message: err.message || "Some error occurred.",
// 		});
// 	}
// };
//Get all vendors
exports.findAll = async (req, res) => {
	try {
		const { page, size, search, column, sort , startDate,endDate } = req.query;
		const { limit, offset } = await getPagination(page, size);
		let sorting = {};
		console.log(sort, column, "column",);
		// if (sort === -1 && column == "companyName") {
		// 	sorting = {
		// 		companyName: -1, // Sort by companyName in descending order
		// 	};
		// } else {
		// 	sorting = {
		// 		companyName: -1, // Sort by companyName in ascending order
		// 	};
		// }
		// console.log(sorting, "sorting");
		const pipeline = [
			{
				$match: { isDeleted: false },
			},

			{
				$graphLookup: {
					from: "customers",
					startWith: "$_id",
					connectFromField: "_id",
					connectToField: "vendorId",
					as: "customers",
					restrictSearchWithMatch: { isDeleted: false },
				},
			},
			{
				$graphLookup: {
					from: "patients",
					startWith: "$_id",
					connectFromField: "_id",
					connectToField: "vendorId",
					as: "patients",
					restrictSearchWithMatch: { isDeleted: false },
				},
			},
			{
				$graphLookup: {
					from: "ecgScans",
					startWith: "$patients._id",
					connectFromField: "patients._id",
					connectToField: "patientId",
					as: "ecgScans",
				},
			},

			{
				$group: {
					_id: "$_id",
					companyName: { $first: "$companyName" },
					address: { $first: "$address" },
					managerName: { $first: "$managerName" },
					uniqueCode: { $first: "$uniqueCode" },
					createdAt: { $first: "$createdAt" },
					phoneNumber: { $first: "$phoneNumber" },
					totalCustomer: {
						$sum: {
							$cond: {
								if: {
									$gt: [{ $size: { $ifNull: ["$customers", []] } }, 0],
								},
								then: { $size: { $ifNull: ["$customers", []] } },
								else: 0,
							},
						},
					},
					totalUser: {
						$sum: {
							$cond: {
								if: {
									$gt: [{ $size: { $ifNull: ["$patients", []] } }, 0],
								},
								then: { $size: { $ifNull: ["$patients", []] } },
								else: 0,
							},
						},
					},
					totalElectrocardiogram: {
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
				},
			},
			// {
			// 	$sort: { companyName: 1 }, // Sort by createdAt in descending order before grouping
			// },
			{
				$sort: { createdAt: -1 }, // Sort by createdAt in descending order before grouping
			},

			{
				$project: {
					_id: 1,
					companyName: 1,
					address: 1,
					managerName: 1,
					phoneNumber: 1,
					totalCustomer: 1,
					totalElectrocardiogram: 1,
					totalUser: 1,
					uniqueCode:1,
					createdAt: 1,
				},
			},
		];

		if (search) {
			const escapedSearch = search.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
			pipeline.push({
				$match: {
					companyName: {
						$regex: escapedSearch,
						$options: "si",
					},
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
			console.log("-------- search with start and endDate -----")
			pipeline.push({
				$match: {
					"createdAt": {
						$gte:StartDateString,
						$lte:endDateString
					}
				}
			});

			
		} 
		// else if(startDate)  {
		// 	console.log("-------- search with start date only -----")
		// 	pipeline.push({
		// 		$match: {
		// 			"createdAt": {
		// 				$gte:StartDateString,
		// 				$lte:endDateForOneDate
		// 			}
		// 		}
		// 	});
		// }


		if (column === "companyName") {
			// Add the $sort stage to sort by companyName in ascending order (1) or descending order (-1)
			pipeline.push({
				$sort: {
					companyName: sort == -1 ? -1 : 1,
				},
			});
		}
		if (column === "totalUser") {
			// Add the $sort stage to sort by companyName in ascending order (1) or descending order (-1)
			pipeline.push({
				$sort: {
					totalUser: sort == -1 ? -1 : 1,
				},
			});
		}
		if (column === "totalElectrocardiogram") {
			// Add the $sort stage to sort by companyName in ascending order (1) or descending order (-1)
			pipeline.push({
				$sort: {
					totalElectrocardiogram: sort == -1 ? -1 : 1,
				},
			});
		}
		if (column === "totalCustomer") {
			// Add the $sort stage to sort by companyName in ascending order (1) or descending order (-1)
			pipeline.push({
				$sort: {
					totalCustomer: sort == -1 ? -1 : 1,
				},
			});
		}
		if (column === "managerName") {
			console.log(column, "column");
			// Add the $sort stage to sort by companyName in ascending order (1) or descending order (-1)
			pipeline.push({
				$sort: {
					managerName: sort == -1 ? -1 : 1,
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
		let resultCount = await Vendor.aggregate(pipeline);
		// console.log(resultCount, size, "size");

		if (resultCount.length) {
			data.totalDocs = resultCount.length;
			data.totalPages = Math.max(Math.round(resultCount.length / size), 1);
		}

		if (page && size) {
			data.page = parseInt(page);
			pipeline.push({
				$skip: (page - 1) * size,
			});
			pipeline.push({
				$limit: parseInt(size),
			});
		}

		let result = await Vendor.aggregate(pipeline);
		if (result) {
			data.docs = result;
		}
		// console.log(result, "result");

		return response.successResponseWithPagingData(res, 200, data);
	} catch (err) {
		return res.status(500).send({
			message: err.message || "Some error occurred.",
		});
	}
};

//Get Single vendor with the specified id in the request
exports.findOne = async (req, res) => {
	try {
		const id = req.params.id;
		if ((!id && id === undefined) || id === ":id") {
			return res
				.status(200)
				.send({ status: 0, message: "id parameter value is required" });
		}

		let condition = { _id: id };
		let data = await Vendor.findById(condition).exec();
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

// Delete a Vendor  with the specified id in the request
exports.delete = async (req, res) => {
	const id = req.params.id;
	if ((!id && id === undefined) || id === ":id") {
		return res
			.status(200)
			.send({ status: 0, message: "id parameter value is required" });
	}
	try {
		let condition = { _id: req.params.id };

		// Check Category Exists or not
		let data = await Vendor.findById(condition).exec();

		if (!data) return response.errorMsgResponse(res, 200, MESSAGE.NO_RECORD);

		// Update Delete Status
		condition = { _id: req.params.id };
		await Vendor.findByIdAndUpdate(
			condition,
			{ isDeleted: true },
			{ new: true }
		).exec();
		let patient = await Patient.updateMany(
			{
				vendorId: new mongoose.Types.ObjectId(req.params.id),
				customerId: { $exists: false },
			},
			{ $set: { uniqueCode: "" } }
		).exec();

		console.log(patient, "patientpatientpatient");

		// Find patients with referral code associated with the customer
		const patientsWithReferralCode = await Patient.find({
			vendorId: new mongoose.Types.ObjectId(req.params.id),
			customerId: { $ne: null },
		}).populate("customerId", "uniqueCode");

		// Update patients with the uniqueCode of their associated vendorId
		const updatePromises = patientsWithReferralCode.map(async patient => {
			if (patient.customerId) {
				// Update the patient's uniqueCode with the vendorId's uniqueCode
				await Patient.updateOne(
					{ _id: patient._id },
					{ $set: { uniqueCode: patient.customerId.uniqueCode } }
				);
			}
		});

		// Wait for all update operations to complete
		await Promise.all(updatePromises);

		// Reset uniqueCode for patients without a vendorId
		await Patient.findOneAndUpdate(
			{
				vendorId: new mongoose.Types.ObjectId(req.params.id),
				customerId: { $ne: null },
			},
			{ $set: { uniqueCode: "" } },
			{ new: true, lean: true }
		).exec();

		// Unset customerId for all patients associated with the customer
		await Patient.updateMany(
			{ vendorId: new mongoose.Types.ObjectId(req.params.id) },
			{ $unset: { vendorId: "" } }
		).exec();
		// Update uniqueCode for patients with a specific vendorId and no customerId

		return response.successResponse(res, 200);
	} catch (err) {
		return response.errorMsgResponse(
			res,
			500,
			err.message || "Some error occurred while delete the Property."
		);
	}
};
// Block a Vendor with the specified id in the request
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
		let data = await Vendor.findById(condition).exec();
		if (!data) {
			return response.errorMsgResponse(res, 200, MESSAGE.NO_RECORD);
		}
		const isBlocked = postData.isBlocked;
		await Vendor.findByIdAndUpdate(condition, {
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
// create ecel sheet
exports.excelSheet = async (req, res) => {
	try {

		const {lang} = req.query
		const pipeline = [
			{
				$match: { isDeleted: false },
			},

			{
				$graphLookup: {
					from: "customers",
					startWith: "$_id",
					connectFromField: "_id",
					connectToField: "vendorId",
					as: "customers",
					restrictSearchWithMatch: { isDeleted: false },
				},
			},
			{
				$graphLookup: {
					from: "patients",
					startWith: "$_id",
					connectFromField: "_id",
					connectToField: "vendorId",
					as: "patients",
					restrictSearchWithMatch: { isDeleted: false },
				},
			},
			{
				$graphLookup: {
					from: "ecgScans",
					startWith: "$patients._id",
					connectFromField: "patients._id",
					connectToField: "patientId",
					as: "ecgScans",
				},
			},

			{
				$group: {
					_id: "$_id",
					companyName: { $first: "$companyName" },
					address: { $first: "$address" },
					managerName: { $first: "$managerName" },
					createdAt: { $first: "$createdAt" },
					phoneNumber: { $first: "$phoneNumber" },
					totalCustomer: {
						$sum: {
							$cond: {
								if: {
									$gt: [{ $size: { $ifNull: ["$customers", []] } }, 0],
								},
								then: { $size: { $ifNull: ["$customers", []] } },
								else: 0,
							},
						},
					},
					totalUser: {
						$sum: {
							$cond: {
								if: {
									$gt: [{ $size: { $ifNull: ["$patients", []] } }, 0],
								},
								then: { $size: { $ifNull: ["$patients", []] } },
								else: 0,
							},
						},
					},
					totalElectrocardiogram: {
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
				},
			},
			{
				$sort: { createdAt: -1 }, // Sort by createdAt in descending order before grouping
			},
			{
				$project: {
					_id: 1,
					companyName: 1,
					address: 1,
					managerName: 1,
					phoneNumber: 1,
					totalCustomer: 1,
					totalElectrocardiogram: 1,
					totalUser: 1,
					createdAt: 1,
				},
			},
		];

		let result = await Vendor.aggregate(pipeline);
		console.log(result, "result");

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
		let ws = wb.addWorksheet("Vendor Data", options);

		let headers = [
			"Company Name",
			"Address",
			"Manager Name",
			"Phone Number",
			"Total Customers",
			"Total Users",
			"Total Electrocardiogram",
			"Created At",
		];
		if(lang === 'ko'){
            headers = [
				"업체명",
                "주소",
                "담당자",
                "휴대폰 번호",
                "고객사 합계",
                "수진자 합계",
                "심전도 합계",
                "생성일",
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
		ws.getColumn(8).width = 30;
		// First TAB

		result.forEach((vendor, index) => {
			// Assuming you want to start populating data from row 4 (row 1 is for headers)
			console.log(index, "index");
			const rowIndex = index + 2;

			// Populate data in each column
			ws.getCell(rowIndex, 1).value = vendor.companyName
				? vendor.companyName
				: "-";
			ws.getCell(rowIndex, 2).value = vendor.address ? vendor.address : "-";
			ws.getCell(rowIndex, 3).value = vendor.managerName
				? vendor.managerName
				: "-";
			ws.getCell(rowIndex, 4).value = vendor.phoneNumber
				? vendor.phoneNumber
				: "-";
			ws.getCell(rowIndex, 5).value = vendor.totalCustomer
				? vendor.totalCustomer
				: "-";
			ws.getCell(rowIndex, 6).value = vendor.totalUser
				? vendor.totalUser
				: "-";
			ws.getCell(rowIndex, 7).value = vendor.totalElectrocardiogram
				? vendor.totalElectrocardiogram
				: "-";
			ws.getCell(rowIndex, 8).value = moment(vendor.createdAt).format(
				"YYYY-MM-DD"
			)
				? moment(vendor.createdAt).format("YYYY-MM-DD")
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
		let fname = lang === "ko" ? "_공급업체" : "_Vendor"
		let filename = `${sanitizedTimestamp}${fname}.xlsx`; // Include the filename here
		const filePath = path.join(__dirname, "../../../uploads/", filename); // Add a "/" after "uploads"
		console.log(filePath, "filePathfilePath");
		// Write the Excel file
		await wb.xlsx.writeFile(filePath);
		// Construct the redirect URL
		let resData = {};
		console.log(config.adminUrl, "config.adminUrl");
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
