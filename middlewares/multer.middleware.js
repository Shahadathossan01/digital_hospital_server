const multer = require('multer');
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads'); // Specify the folder to save uploaded files
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`); // Rename file with timestamp
    },
});

const upload = multer({ storage });
module.exports=upload