const content = require("../Content/Contentcontroller");
let ValidationSchema = require("../Content/Contentvalidation");
const router = require("express").Router();

router.post("/create", ValidationSchema.create, content.create);
router.put("/update/:id",ValidationSchema.update,content.update);
router.get("/getAll", content.getAll);
router.get("/get/:id", content.get);
router.delete("/delete/:id", content.delete);

module.exports = router;
