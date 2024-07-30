const mongoose = require("mongoose");
const mongoosePaginate = require("mongoose-paginate-v2");
const Vendor = require("../Vendor/Vendormodel");
const Admin = require("../Admin/Adminmodel");
const aggregatePaginate = require("mongoose-aggregate-paginate-v2");

let schema = mongoose.Schema(
	{
		vendorId: { type: mongoose.Schema.Types.ObjectId, ref: Vendor },
		adminId: { type: mongoose.Schema.Types.ObjectId, ref: Admin },
		name: { type: String, required: true, lowercase: true },
		countryCode: { type: String, required: true, trim: true },
		phoneNumber: { type: String, required: true, trim: true },
		address: { type: String, required: true, trim: true },
		uniqueCode: { type: String, required: true, trim: true },
		managerName: { type: String, required: true, lowercase: true },
		managerCountryCode: { type: String, required: true, trim: true },
		managerPhoneNumber: { type: String, required: true, trim: true },
		email: { type: String, required: true, trim: true, lowercase: true },
		bucketName: { type: String, required: true, trim: true },
		folderName: { type: String, required: false, trim: true },
		password: { type: String, required: true, trim: true },
		profileImage: { type: String, required: false, trim: true, default:"" },
		// decryptPassword: { type: String, required: true, trim: true },
		isBlocked: { type: Boolean, required: true, default: false },
		isTempPassword: { type: Boolean, default: false, required: true },
		isDeleted: { type: Boolean, required: true, default: false },
		role: { type: Number, required: false, trim: true },
	},
	{ timestamps: true }
);

schema.plugin(aggregatePaginate);

const Customer = mongoose.model("customer", schema);

module.exports = Customer;
