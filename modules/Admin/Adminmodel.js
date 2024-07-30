const mongoose = require("mongoose");
const mongoosePaginate = require("mongoose-paginate-v2");

let schema = mongoose.Schema(
	{
		name: { type: String, required: true, trim: true },
		email: { type: String, required: true, trim: true, lowercase: true },
		password: { type: String, required: true, trim: true },
		isDeleted: { type: Boolean, required: true, default: false },
		isTempPassword: { type: Boolean, default: false, required: true },
		role: { type: Number, required: false, trim: true }, //1 for admin 2 for subAdmin
	},
	{ timestamps: true }
);

schema.plugin(mongoosePaginate);

const Admin = mongoose.model("admin", schema);

module.exports = Admin;
