const mongoose = require("mongoose");
const mongoosePaginate = require("mongoose-paginate-v2");

const Patient = require("../Patient/Patientmodel");
const aggregatePaginate = require("mongoose-aggregate-paginate-v2");

let schema =  new mongoose.Schema({
	latestIOSVersion: { type: Number, default: "", trim: true },
	latestAndroidVersion: { type: Number, default: "", trim: true },
	criticalAndroidVersion: { type: Number, default: "", trim: true },
	criticalIOSVersion: { type: Number, default: "", trim: true },
	// appType: { type: String, default: "", trim: true },
	
},	{ timestamps: true });

// schema.index({ locationLatLong: "2dsphere" });
// schema.plugin(mongoosePaginate);
schema.plugin(aggregatePaginate);

const Appversions = mongoose.model("appVersions", schema);

module.exports = Appversions;
