const mongoose = require("mongoose");
const mongoosePaginate = require("mongoose-paginate-v2");
const Admin = require("../Admin/Adminmodel");
let schema = new mongoose.Schema(
	{
		adminId: { type: mongoose.Schema.Types.ObjectId, ref: Admin },
		companyName: { type: String, required: true, lowercase: true },
		countryCode: { type: String, required: true, trim: true },
		phoneNumber: { type: String, required: true, trim: true },
		uniqueCode: { type: String, required: true, trim: true },
		managerName: { type: String, required: true, lowercase: true },
		managerCountryCode: { type: String, required: true, trim: true },
		managerPhoneNumber: { type: String, required: true, trim: true },
		email: { type: String, required: true, trim: true, lowercase: true },
		bucketName: { type: String, required: true, trim: true },
		folderName: { type: String, required: false, trim: true },
		address: { type: String, required: true, trim: true },
		isTempPassword: { type: Boolean, default: false, required: true },
		password: { type: String, required: true, trim: true },
		// decryptPassword: { type: String, required: true, trim: true },
		isBlocked: { type: Boolean, required: true, default: false },
		isDeleted: { type: Boolean, required: true, default: false },
	},
	{ timestamps: true }
);

// schema.index({ locationLatLong: "2dsphere" });
schema.plugin(mongoosePaginate);

const Vendor = mongoose.model("vendor", schema);

module.exports = Vendor;
