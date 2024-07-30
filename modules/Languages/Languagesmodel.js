const mongoose = require("mongoose");
const mongoosePaginate = require("mongoose-paginate-v2");
const LanguageStrings = require("./LanguagesStringsmodel");
const aggregatePaginate = require("mongoose-aggregate-paginate-v2");

let schema = mongoose.Schema(
	{
		languageId: {
			type: mongoose.Schema.Types.ObjectId,
			// ref: LanguageStrings,
		},
		name: { type: String, required: true },
		code: { type: String, required: true },
		status: { type: String, required: true },
	},
	{ timestamps: true }
);

schema.plugin(aggregatePaginate);

const Language = mongoose.model("language", schema);

module.exports = Language;
