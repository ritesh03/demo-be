const Appversions = require("./Appversionscontroller.js");
let router = require("express").Router();


//send notification 
router.post("/add", Appversions.addVersions);
// get notification for admin 
router.get("/get",  Appversions.getVersions);


module.exports = router;
