const mongoose = require("mongoose");
const mongoosePaginate = require("mongoose-paginate-v2");

const Patient = require("../Patient/Patientmodel");
const aggregatePaginate = require("mongoose-aggregate-paginate-v2");

let schema =  new mongoose.Schema({
	senderId: { type: String, default: null },
	receiverIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
	readIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
	deleteIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
	type: {
		type: String,

	},
	title:{ type: String, default: "" },
	message: { type: String, default: "", trim: true },
	link: { type: String, default: "", trim: true },
	isDeleted: { type: Boolean, default: "false" },
	IsRead: { type: Boolean, default: "false", trim: true  },
	actionPerformed: { type: String, default: "", trim: true  }, // by admin 
},	{ timestamps: true });

// schema.index({ locationLatLong: "2dsphere" });
// schema.plugin(mongoosePaginate);
schema.plugin(aggregatePaginate);

const Notification = mongoose.model("notification", schema);

module.exports = Notification;
