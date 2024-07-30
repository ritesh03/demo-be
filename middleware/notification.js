
/////


const async = require('async');
const FCM = require('fcm-node');
let path = require("path");
var FireBaseadmin = require("firebase-admin");
var filepath = path.join(
	path.join(__dirname, "../", "config"),
	"firebase-adminsdk-otap8-1e8a944e90.json"
);

const config = require("../config/auth.config");

// console.log("filepath", filepath);
//let fcm = new FCM(serverKeyUser);
FireBaseadmin.initializeApp({
	credential: FireBaseadmin.credential.cert(filepath),
});

// Fetch the service account key JSON file path
// const serviceAccount = require(filepath);



const SendUserFCM  = function (userDeviceToken, payloadData, type) {
	
	let message = {
		//registration_ids: userDeviceToken, //registration_ids
		notification: {
			sound: "default",
			badge: "1",
			title: payloadData.title || "" ,
			body: payloadData.message|| "",
			type:  payloadData.type|| "", 
			icon:`${config.adminUrlLogin}/assets/images/app_store.png`
		
		},
		data: {
			sound: "default",
			badge: "1",
			title: payloadData.title|| "",
			body: payloadData.message|| "",
			type: payloadData.type|| "",
	
		},
		//priority: "high",
	};
	const notification_options = {
		priority: "high",
		timeToLive: 60 * 60 * 24,
	};
	console.log("userDeviceToken", userDeviceToken);
      FireBaseadmin.messaging()
		.sendToDevice(userDeviceToken, message, notification_options)
		.then(response => {
			console.log("Notification sent successfully", response);
		})
		.catch(error => {
			console.log("Notification error", error);
			console.log(error);
		});

}

module.exports = {
    SendUserFCM: SendUserFCM,
  
};