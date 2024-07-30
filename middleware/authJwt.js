const MESSAGE = require("../constant/message.json");
const jwt = require("jsonwebtoken");
const config = require("../config/auth.config.js");
const response = require("../helper/response");
const mongoose = require("mongoose");
// const patient = require("../modules/Patient/Patient.model");
const Admin = require("../modules/Admin/Adminmodel");
const Vendor = require("../modules/Vendor/Vendormodel");
const Customer = require("../modules/Customer/Customermodel");
const Patient = require("../modules/Patient/Patientmodel");
// const customer = require("../modules/Customer/Customer.model");
// const vendor = require("../modules/Vendor/Vendor.model");

let isAdmin = async (req, res, next) => {
	let token = req.headers["x-access-token"];
	if (!token) {
		return res.status(403).send({ message: "No token provided!" });
	}

	jwt.verify(token, config.secret, async (err, decoded) => {
		if (err) {
			return res
				.status(401)
				.send({ message: "Unauthorized or Token expire!" });
		}

		req.userId = decoded.id;
		if (req.userId) {
			let user = await Admin.findById(req.userId).exec();

			if (user) {
				if (user.isDeleted == true) {
					return response.errorMsgResponse(
						res,
						401,
						MESSAGE.ACCOUNT_DELETED
					);
				}
				if (user.isBlocked == true) {
					return response.errorMsgResponse(
						res,
						401,
						MESSAGE.BLOCKED_BY_ADMIN
					);
				}
			}
		}
		next();
	});
};

let isPatient = async (req, res, next) => {

	let token = req.headers["x-access-token"];
	if (!token) {
		return res.status(403).send({ message: "No token provided!" });
	}

	jwt.verify(token, config.secret, async (err, decoded) => {
		if (err) {
			return res
				.status(401)
				.send({ message: "Unauthorized or Token expire!" });
		}
		req.userId = decoded.id;
		if (req.userId) {
			let user = await Patient.findById(req.userId).exec();
			// console.log(user, "user");
			if (!user) {
				return response.errorMsgResponse(
					res,
					401,
					MESSAGE.NOT_AUTHENTICATED
				);
			}
			if (user) {
				if (user.isDeleted == true) {
					return response.errorMsgResponse(
						res,
						401,
						MESSAGE.ACCOUNT_DELETED
					);
				}
			}
		}
		next();
	});
};

let IsAdminVendor = async (req, res, next) => {
	let token = req.headers["x-access-token"];
	if (!token) {
		return res.status(403).send({ message: "No token provided!" });
	}

	jwt.verify(token, config.secret, async (err, decoded) => {
		if (err) {
			return res
				.status(401)
				.send({ message: "Unauthorized or Token expire!" });
		}

		if (decoded.id) {
			// Search for an Admin with the given ID
			let admin = await Admin.findOne({
				_id: new mongoose.Types.ObjectId(decoded.id),
			}).exec();

			// Search for a Vendor with the given ID
			let vendor = await Vendor.findById(
				new mongoose.Types.ObjectId(decoded.id)
			).exec();

			if (admin) {
				// If an Admin is found, set the adminId and role
				req.adminId = admin._id;
				req.role = 1; // for admin
			} else if (vendor) {
				// If a Vendor is found (and Admin is not found), set the vendorId and role
				req.vendorId = vendor._id;
				req.role = 2; // for vendor
			} else {
				// If neither Admin nor Vendor is found, return an error
				return response.errorMsgResponse(res, 500, MESSAGE.NOT_FOUND);
			}
			// console.log(vendor, "vendor");
			// Check if the user is deleted or blocked
			if (admin && admin.isDeleted == true) {
				return response.errorMsgResponse(res, 401, MESSAGE.ACCOUNT_DELETED);
			}

			if (vendor && vendor.isDeleted == true) {
				return response.errorMsgResponse(res, 401, MESSAGE.ACCOUNT_DELETED);
			}
		}
		next();
	});
};

let IsAdminVendorCustomer = async (req, res, next) => {
	let token = req.headers["x-access-token"];
	if (!token) {
		return res.status(403).send({ message: "No token provided!" });
	}

	jwt.verify(token, config.secret, async (err, decoded) => {
		if (err) {
			return res
				.status(401)
				.send({ message: "Unauthorized or Token expire!" });
		}

		if (decoded.id) {
			try {
				const adminUser = await Admin.findById(decoded.id).exec();
				const vendorUser = await Vendor.findById(decoded.id).exec();
				const customerUser = await Customer.findById(decoded.id).exec();
				const patientUser = await Patient.findById(decoded.id).exec();

				let user;
				let userType;
				let role;

				if (adminUser) {
					user = adminUser;
					userType = "admin";
					role = 0;
				} else if (vendorUser) {
					user = vendorUser;
					userType = "vendor";
					role = 2;
				} else if (customerUser) {
					user = customerUser;
					userType = "customer";
					role = 3;
				} else if (patientUser) {
					user = patientUser;
					userType = "user";
					role = 4;
				} else {
					return response.errorMsgResponse(
						res,
						200,
						MESSAGE.NOT_AUTHENTICATED
					);
				}

				// Check if the user is deleted or blocked
				if (user.isDeleted) {
					return response.errorMsgResponse(
						res,
						401,
						MESSAGE.ACCOUNT_DELETED
					);
				}

				if (userType === "admin") {
					req.adminId = user._id;
				} else if (userType === "vendor") {
					req.vendorId = user._id;
				} else if (userType === "customer") {
					req.customerId = user._id;
				} else if (userType === "user") {
					req.userId = user._id;
				}
				// Set request properties
				req.userType = userType;
				req.role = role;
				req.id = user._id;

				if (user && user.isDeleted == true) {
					return response.errorMsgResponse(
						res,
						401,
						MESSAGE.ACCOUNT_DELETED
					);
				}
			} catch (error) {
				// Handle any database query errors here
				console.error(error);
				return response.errorMsgResponse(res, 500, "Internal Server Error");
			}
		}

		next();
	});
};

let IsAdminVendorCustomerPatient = async (req, res, next) => {
	let token = req.headers["x-access-token"];
	if (!token) {
		return res.status(403).send({ message: "No token provided!" });
	}

	jwt.verify(token, config.secret, async (err, decoded) => {
		if (err) {
			return res
				.status(401)
				.send({ message: "Unauthorized or Token expire!" });
		}
		let user 
		let role
		if (decoded.id) {
			// console.log("------decoded")
			// console.log(decoded)
			adminUser = await Admin.findById(decoded.id).exec();
			// console.log(user,"useruseruseruseruser");
			if (adminUser) {
				// console.log("--- ENTER ADMMIN ---")
				user = adminUser;
				req.adminId = adminUser._id;
				req.role = 0;
			} 
			vendorUser = await Vendor.findById(decoded.id).exec();
			if (vendorUser) {
				// console.log("--- ENTER VENDROD ---")
				user = vendorUser;
				req.vendorId = vendorUser._id;
				role = 2;
			}			
					
			let CustomerUser = await Customer.findById(decoded.id).exec();
			if (CustomerUser) {
				// console.log("--- ENTER CUSTOMER ---")
				user = CustomerUser;
				req.customerId = CustomerUser._id;
				role = 3;
			}
					

			patientUser = await Patient.findById(decoded.id).exec();
			if (patientUser) {
				// console.log("--- ENTER PATIENT ---")
				user = patientUser;
				req.userId = patientUser._id;
				role = 4;
			
			}
		
			if(user == null){
				return res
						.status(401)
						.send({ message: "Unauthorized or Token expire!" });
			}
			if (user) {
				req.id = user._id;
				req.userId = user._id;
				req.role = role
				if (user.isDeleted == true) {
					// return res
					// 	.status(401)
					// 	.send({ message: "Unauthorized or Token expire!" });

						return response.errorMsgResponse(
							res,
							401,
							MESSAGE.ACCOUNT_DELETED
						);
				}
			}
		}
		next();
	});
};

const authJwt = {
	isAdmin,
	IsAdminVendorCustomer,
	IsAdminVendor,
	IsAdminVendorCustomerPatient,
	isPatient,
};
module.exports = authJwt;
