const Notification = require("./Notificationcontroller.js");
let router = require("express").Router();
let ValidationSchema = require("./Notificationvalidation.js");
const authJwt = require("../../middleware/authJwt.js");


//send notification 
router.post("/send",authJwt.isAdmin, Notification.sendNotification);
// get notification for admin 
router.get("/get", authJwt.IsAdminVendorCustomerPatient, Notification.findAll);
// get notification unread count
router.get("/getNotificationUnreadCount", authJwt.IsAdminVendorCustomerPatient, Notification.getNotificationUnreadCount);
// delete notification 
router.delete("/delete/:id",Notification.delete);

module.exports = router;
