const mongoose = require("mongoose");

let schema = mongoose.Schema(
	{
		name: { type: String, required: true, trim: true },
		heading: { type: String, required: true, trim: true },
		subHeading: { type: String, required: true, trim: true },
		priority: { type: Number, required: false },
		isDeleted: { type: Boolean, required: true, default: false },
        image: { type: String, required: false, trim: true,default:"" },
		languageType: {type: String, required:true, trim:true}
	},
	{ timestamps: true }
);

const Content = mongoose.model("content", schema);

module.exports = Content;