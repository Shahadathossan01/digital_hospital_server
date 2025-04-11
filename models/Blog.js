const mongoose = require('mongoose');

const blogSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    image: {
        type: String,
        required: true
    },
    subTitle: {
        type: String,
        required: true
    },
    header1: {
        type: String,
        required: true
    },
    details1: {
        type: String,
        required: true
    },
    header2: {
        type: String
    },
    details2: {
        type: String
    },
    header3: {
        type: String
    },
    details3: {
        type: String
    }
}, { timestamps: true });

const Blog= mongoose.model('Blog', blogSchema);
module.exports = Blog;