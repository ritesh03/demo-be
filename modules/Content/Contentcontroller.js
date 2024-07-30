const MESSAGE = require("../../constant/message.json");
const Content = require("../Content/Contentmodel");
const { validationResult } = require("express-validator");
const {getPagination, Failures} = require("../../middleware/common");
const mongoose = require("mongoose");
const response = require("../../helper/response");


exports.create = async (req, res) => {

	let resData = {};
	const postData = req.body;

	try {
		// Validate request
		const errors = validationResult(req).formatWith(Failures);
		if (!errors.isEmpty()) {
			return res.status(422).json({ errors: errors.array() });
		}

		if (postData.heading  &&  postData.subHeading ){
		    let data = await Content.create(postData);
		    if (data ) {
				resData._id = data._id;
				resData.name = data.name;
				resData.heading = data.heading;
				resData.subHeading = data.subHeading;
				resData.priority = data.priority;
				resData.isDeleted = data.isDeleted ;
				resData.languageType = data.languageType ;
				resData.image = data.image ? data.image : "";
			}
		}
		return response.successResponseWithData(res, 200, resData);
	} catch (err) {
		console.log(err,"errerrerr")
		return response.errorMsgResponse(
			res,
			500,
			err.message || "Some error occurred while creating the Content."
		);
	}
};

exports.update = async (req, res) => {
	const id = req.params.id;
	const postData = req.body;

	if ((!id && id === undefined) || id === ":id") {
		return res
			.status(200)
			.send({ status: 0, message: "id parameter value is required" });
	}
	try {
		
		let dataToUpdate ={}

		//check vendor duplicate phone number
		if (postData.name) {
			let contentWithSameName = await Content.findOne({
				name: postData.name,
				isDeleted: false,
				_id: { $ne: id }
			}).exec();
			if (contentWithSameName) {
				return response.errorMsgResponse(
					res,
					200,
                    "Content with same name already exists"
					// MESSAGE.PHONE_ALREADY_EXISTS
				);
			}
		}

		dataToUpdate.name=postData.name
		dataToUpdate.heading=postData.heading
		dataToUpdate.subHeading=postData.subHeading
		dataToUpdate.priority=postData.priority
		dataToUpdate.image=postData.image
		dataToUpdate.languageType=postData.languageType
		
		let condition = { _id: id };
		
		let data = await Content.findByIdAndUpdate(condition, dataToUpdate, {
			new: true,
		})
        .select( "name heading subHeading image priority")
		.exec();

		if (!data) return response.errorMsgResponse(res, 200, MESSAGE.NO_RECORD);

		return response.successResponseWithData(res, 200, data);
	} catch (err) {
		console.log(err, "err");
		return response.errorMsgResponse(
			res,
			500,
			err.message || "Some error occurred while updating the content."
		);
	}
};

exports.getAllOld = async (req, res) => {
    try {
        const count = parseInt(req.query.count, 10); // Convert count from query parameter to an integer
        console.log(`Received count parameter: ${count}`);

        const pipeline = [
            {
                $match: { isDeleted: false },
            },
            {
                $sort: { priority: 1 } // Sort by priority in ascending order
            },
            {
                $project: { // Select only the specified fields
                    _id: 1,
                    name: 1,
                    heading: 1,
                    subHeading: 1,
                    priority: 1
                }
            }
        ];

        // Add the $limit stage if count is 5
        if (count === 5) {
            console.log('Adding $limit stage to the pipeline');
            pipeline.push({
                $limit: 5 // Return only the first 5 results
            });
        }

        console.log('Pipeline:', JSON.stringify(pipeline, null, 2));
        let result = await Content.aggregate(pipeline);
        console.log('Result:', result);

        return response.successResponseWithData(res, 200, result);
    } catch (err) {
        console.error('Error occurred:', err);
        return response.errorMsgResponse(
            res,
            500,
            err.message || "Some error occurred while getting the content."
        );
    }
};

exports.getAll = async (req, res) => {
	try {
		console.log(req.role,"req.role")
		console.log(req.userId, "req.userId");
		const { page, size, search, column, sort } = req.query;
		const { limit, offset } = await getPagination(page, size);
		let match = {

		};
		
		const patientIds = [];

	
			let pipeline = [
				{
					$match: { isDeleted: false },
				},
				
				{ $match: match },
			
	
				{
					$sort: {
						createdAt: -1, // Sort by the createdAt field of the first ECG record
					},
				},
				{
					$project: {
						
						"name":1,
						"heading":1,
						"subHeading":1,
						"image":1,
						"languageType":1,
						"createdAt":1,
						"updatedAt":1,
						
				
					},
				},
			]
			let data = {};
	
			let resultCount = await Content.aggregate(pipeline);
			// console.log(resultCount.length, "resultCount.length ");
			if (resultCount.length) {
				data.totalDocs = resultCount.length;
				data.totalPages = Math.ceil(resultCount.length / size);
			}

			if (page && size) {
				data.page = parseInt(page);
				pipeline.push({
					$skip: (page - 1) * size,
				});
				pipeline.push({
					$limit: parseInt(size),
				});
			}

			let result = await Content.aggregate(pipeline);
			if (result) {
				data.docs = result;
			}
			
			
			return response.successResponseWithPagingData(res, 200, data);
		
	} catch (err) {
		return res.status(500).send({
			message: err.message || "Some error occurred.",
		});
	}
};

exports.get = async (req, res) => {
	try {
		let id = req.params.id;
		

		let result = await Content.findOne({
			_id: id,
			isDeleted: false,
		}).exec();
		console.log("-----------",result)

		if (!result)
			return response.errorMsgResponse(res, 200, MESSAGE.NO_RECORD);

		return response.successResponseWithData(res, 200, result);
	} catch (err) {
		return response.errorMsgResponse(
			res,
			500,
			err.message || "Some error occurred while get the Category."
		);
	}
};


exports.delete = async (req, res) => {
	try {
        const id = req.params.id;

	    if ((!id && id === undefined) || id === ":id") {
		    return res
			.status(200)
			.send({ status: 0, message: "id parameter value is required" });
	    }
		let condition = { _id: id };

		// Check Category Exists or not
		let data = await Content.findById(condition).exec();

		if (!data) return response.errorMsgResponse(res, 200, MESSAGE.NO_RECORD);

		// Update Delete Status
		let dataToUpdate = {
			isDeleted: true,
		};
		await Content.findByIdAndUpdate(condition, dataToUpdate, {
			new: true,
		}).exec();
		return response.successResponse(res, 200);
	} catch (err) {
		return response.errorMsgResponse(
			res,
			500,
			err.message || "Some error occurred while deleting the Content."
		);
	}
};