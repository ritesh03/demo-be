const fs = require('fs');
const path = require('path');
const multer = require("multer");

const checkFileType = function (file, cb) {
    //Allowed file extensions
    const fileTypes = /jpeg|jpg|png|gif|svg/;
  
    //check extension names
    const extName = fileTypes.test(path.extname(file.originalname).toLowerCase());
  
    const mimeType = fileTypes.test(file.mimetype);
  
    if (mimeType && extName) {
      return cb(null, true);
    } else {
      cb("Error: You can Only Upload Images!!");
    }
  };

const store = multer.diskStorage({
    destination: function (req, file, cb) {
        fs.mkdir(path.join(__dirname, "../pdfs/"), { recursive: true}, function (err) {
            if (err) { 
                console.log(err) 
                return cb(err)
            } 
            cb(null,   __dirname  + "../../pdfs/");
        });
    },
    filename: function (req, file, cb) {
        const name = file.originalname.toLowerCase().split(' ').join('_');
        cb(null, `${Date.now()}-${name}`);
    }
});
const upload = multer({ 
    storage: store ,
    // limits: { fileSize: 10000000 },
    // fileFilter: (req, file, cb) => {
    //     checkFileType(file, cb);
    // }
})
// .single('file');

const upload2 = multer({ 
  storage: store ,
  // limits: { fileSize: 10000000 },
  // fileFilter: (req, file, cb) => {
  //     checkFileType(file, cb);
  // }
})

console.log(upload)
module.exports = {
  upload:upload,
  upload2:upload2
}