const MESSAGE = require("../../constant/message.json");
const Appversions = require("./Appversionsmodel");
const response = require("../../helper/response");

// addVersions
exports.addVersions = async (req, res) => {
	const postData = req.body;
	try {
		let data = await Appversions.create(postData);
			return response.successResponseWithData(res, 200, data);
	} catch (err) {
		console.log(err,"errerrerr")
		return response.errorMsgResponse(
			res,
			500,
			err.message || "Some error occurred while creating the Category."
		);
	}
};


exports.getVersions = async (req, res) => {
	// console.log(req.query,"reqreqreqreq")
    const payloadData =req.query; // Assuming payloadData is defined
    try {
        let data = await Appversions.find({});
        let status;
        if (payloadData.deviceType === "IOS") {
			console.log("1111")
            if (data[0].latestIOSVersion > payloadData.appVersion)
                status = 1; // Any update
            else if (data[0].criticalIOSVersion > payloadData.appVersion)
                status = 2; // Force update
            else
                status = 3; // No update
        } else if (payloadData.deviceType === "ANDROID") {
			console.log("22222")
            if (data[0].latestAndroidVersion > payloadData.appVersion)
                status = 1;
            else if (data[0].criticalAndroidVersion > payloadData.appVersion)
                status = 2;
            else
                status = 3;
        }
        return response.successResponseWithData(res, 200, { status });
    } catch (err) {
        console.log(err, "errerrerr");
        return response.errorMsgResponse(
            res,
            500,
            err.message || "Some error occurred while creating the Category."
        );
    }
};


