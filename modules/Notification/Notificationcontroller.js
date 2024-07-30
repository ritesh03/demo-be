const MESSAGE = require("../../constant/message.json");
const Notification = require("./Notificationmodel");
const Patient = require("../Patient/Patientmodel");
const notificationManager  = require("../../middleware/notification");
const response = require("../../helper/response");
const { matchedData, validationResult } = require("express-validator");
const {
	getPagination,
	Failures,
	getCapitalizeString,
} = require("../../middleware/common");
const mongoose = require("mongoose");

// send notification 
exports.sendNotification = async (req, res) => {
	try {
		let userDeviceToken = []
		// let userDeviceToken = ["dJIgNRFVTEy7oBweL9t9VI:APA91bEm936EhZVKpzbHVBXt1482pcfrEHobNnnABIqC0S7vI3uXhlIa0fcebGQD4Z7s5mXPsnM6qdZlUzNuPWf3CIe844lDvbArKnjUikVO1iTiBV3SsScbMcmJ1UteixH5-zXB5r1T"]
		// let userDeviceToken = ["dm8DRJC_BEWkhPQWCSM8AM:APA91bH1HytyqZfEu-mEXfKxRYq_0ql1qLrbWkVDURvKNl4reGR3mDLaMXXfgKOqP_Egmf-tIKRlMvxB8b8sx1wr50mS857a_lx2XrqvqiVVR8OtCnjnntKtSEddFdH05oOypi8YHKCp"]
		let userIds = []

		let notificationData = req.body
		let result = await Patient.find({
			isDeleted: false,
			deviceId:{$ne:""},
		})
		if (result && result.length) {
			result.map(async obj => {
				if (
					obj.deviceId !== null &&
					obj.deviceId !== "" && obj.deviceId !== undefined
				) {
					userDeviceToken.push(obj.deviceId);
					userIds.push(obj._id);
				}			
			
			});
		}
		console.log(userIds,"userIdsuserIdsuserIds")
		if (userIds && userIds.length) {
		let postData = {
			receiverIds:  userIds ,
			type: notificationData.type,
			title: notificationData.title,
			message: notificationData.message,
			actionPerformed: "By Admin"
		};

		try {
			let data = await Notification.create(postData);
			console.log("Notification saved successfully:", data);
		} catch (error) {
			console.error("Error saving notification:", error);
		}}

		if (userDeviceToken && userDeviceToken.length) {
			notificationManager.SendUserFCM(userDeviceToken,notificationData,"type")
		}

		return response.successResponseWithData(
			res,
			200,
			{},
			MESSAGE.NOTIFICATION_SEND_SUCCESSFULLY
		);
	} catch (err) {
		return response.errorMsgResponse(
			res,
			500,
			err.message || "Some error occurred while get the Dashboard."
		);
	}
};

//Get all notification
exports.findAll = async (req, res) => {
	try {
		console.log(req.role,"req.role")
		console.log(req.userId, "req.userId");
		const { page, size, search, column, sort } = req.query;
		const { limit, offset } = await getPagination(page, size);
		let match = {

		};
		// if (!req.role === 1 && !req.role === 2 || typeof req.role == "undefined" ) {
		// 	match.receiverId = new mongoose.Types.ObjectId(req.userId);
		// }
		
		const patientIds = [];

	
			let pipeline = [
				{
					$match: { isDeleted: false },
				},
				{
					$lookup: {
						from: "patients",
						localField: "patientId",
						foreignField: "_id",
						as: "patient",
					},
				},
				{
					$graphLookup: {
						from: "patients",
						startWith: "$patientId",
						connectFromField: "patientId",
						connectToField: "_id",
						as: "patient",
						restrictSearchWithMatch: { isDeleted: false },
					},
				},
				{
					$unwind: {
						path: "$patient",
						preserveNullAndEmptyArrays: true,
					},
				},
				{ $match: match },
			
	
				{
					$sort: {
						createdAt: -1, // Sort by the createdAt field of the first ECG record
					},
				},
				{
					$project: {
						// "patient.name": 1,
						// "patient.email": 1,
						"message":1,
						"title":1,
						"actionPerformed":1,
						"createdAt":1,
						
				
					},
				},
			]
			let data = {};
	
			let resultCount = await Notification.aggregate(pipeline);
			// console.log(resultCount.length, "resultCount.length ");
			if (resultCount.length) {
				data.totalDocs = resultCount.length;
				data.totalPages = Math.ceil(resultCount.length / size);
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

			let result = await Notification.aggregate(pipeline);
			if (result) {
				data.docs = result;
			}
			console.log(req.userId, " req.userId")
			let rs = await Notification.updateMany(
				{
					receiverIds: req.userId,
					// vendorId: { $ne: null },
				},
				{ $addToSet: { readIds: req.userId } }
			).exec();
			console.log(" UPDATE RECORD ")
			console.log(rs)
			return response.successResponseWithPagingData(res, 200, data);
		
	} catch (err) {
		return res.status(500).send({
			message: err.message || "Some error occurred.",
		});
	}
};

//Get notification count
exports.getNotificationUnreadCount = async (req, res) => {
	try {
		console.log(req.id,"req.ID")
		console.log(req.role,"req.role")
		console.log(req.userId, "req.userId");
		console.log(req.adminId, "req.userId");

		let match = {
			receiverIds:new mongoose.Types.ObjectId(req.userId),
			readIds:{$nin:[new mongoose.Types.ObjectId(req.userId)]}
		};
		// if (!req.role === 1 && !req.role === 2 || typeof req.role == "undefined" ) {
		// 	match.receiverId = new mongoose.Types.ObjectId(req.userId);
		// }
	
			let pipeline = [
				{
					$lookup: {
						from: "patients",
						localField: "patientId",
						foreignField: "_id",
						as: "patient",
					},
				},
				{
					$graphLookup: {
						from: "patients",
						startWith: "$patientId",
						connectFromField: "patientId",
						connectToField: "_id",
						as: "patient",
						restrictSearchWithMatch: { isDeleted: false },
					},
				},
				{
					$unwind: {
						path: "$patient",
						preserveNullAndEmptyArrays: true,
					},
				},
				{ $match: match },	
				{
					$sort: {
						createdAt: -1, // Sort by the createdAt field of the first ECG record
					},
				},
				{
					$project: {
						// "patient.name": 1,
						// "patient.email": 1,
						"message":1,
						"title":1,
						"actionPerformed":1,
						"createdAt":1,					
				
					},
				},
			]
			let data = {};
			// console.log(pipeline)
			let resultCount = await Notification.aggregate(pipeline);
			console.log(resultCount.length, "resultCount.length ");
			if (resultCount.length) {
				data.count = resultCount.length;
				return response.successResponseWithData(res, 200, data);
			}
			data.count = 0
			return response.successResponseWithData(res, 200, data);
			// return response.errorMsgResponse(res, 200, MESSAGE.NO_RECORD);
		
	} catch (err) {
		return res.status(500).send({
			message: err.message || "Some error occurred.",
		});
	}
};

exports.delete = async (req, res) => {
	try {
        const id = req.params.id;

	    if ((!id && id === undefined) || id === ":id") {
		    return res
			.status(200)
			.send({ status: 0, message: "id parameter value is required" });
	    }
		let condition = { _id: id };

		// Check Category Exists or not
		let data = await Notification.findById(condition).exec();

		if (!data) return response.errorMsgResponse(res, 200, MESSAGE.NO_RECORD);

		// Update Delete Status
		let dataToUpdate = {
			isDeleted: true,
		};
		await Notification.findByIdAndUpdate(condition, dataToUpdate, {
			new: true,
		}).exec();
		return response.successResponse(res, 200);
	} catch (err) {
		return response.errorMsgResponse(
			res,
			500,
			err.message || "Some error occurred while deleting the Content."
		);
	}
};