const MESSAGE = require("../../constant/message.json");
const Language = require("./Languagesmodel");
const LanguageConstant = require("./LanguagesStringsmodel");
const bcrypt = require("bcryptjs");
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

//Get all customers
exports.findAll = async (req, res) => {
	try {
		const { page, size } = req.query;
		const { limit, offset } = await getPagination(page, size);

		let options = {
			sort: { name: 1 },
			strictPopulate: false,
			lean: true,
			offset: offset,
			limit: size,
		};
		let criteria = { isDeleted: false };
		let pipeline = [
			{
				$match: criteria,
			},
		];

		let myAggregate = await Language.aggregate(pipeline);

		const data = await Language.aggregatePaginate(myAggregate, options);

		if (data == null) {
			return response.errorMsgResponse(res, 200, MESSAGE.NO_RECORD);
		}
		return response.successResponseWithData(res, 200, data.docs);
	} catch (err) {
		return res.status(500).send({
			message: err.message || "Some error occurred.",
		});
	}
};

exports.getLanguageString = async (req, res) => {
	const postData = req.body;

	try {
		// Validate request
		const errors = validationResult(req).formatWith(Failures);
		if (!errors.isEmpty()) {
			return res.status(422).json({ errors: errors.array() });
		}

		// Check for Language Exits or not
		let resLangData = await Language.findOne({
			_id: new mongoose.Types.ObjectId(postData.id),
		}).exec();

		if (resLangData == null) {
			return response.errorMsgResponse(res, 200, MESSAGE.NO_RECORD);
		}

		// To Get constant corresponds to language
		let resData = await LanguageConstant.findOne({
			_id: new mongoose.Types.ObjectId(resLangData.languageId),
		}).exec();
		if (resData == null) {
			return response.errorMsgResponse(res, 200, MESSAGE.NO_RECORD);
		}

		return response.successResponseWithData(res, 200, resData);
	} catch (err) {
		return response.errorMsgResponse(
			res,
			500,
			err.message || "Some error occurred while creating the Category."
		);
	}
};
