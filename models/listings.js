const mongoose = require('mongoose');

const Schema = mongoose.Schema;
const defaultImageUrl = "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRI69IS84PGeSJDInvyhd8IPU8_1v3iQU0DeA&s";

const imageSchema = new Schema({
    filename : {
        type : String,
        default : "listingimage",
    },
    url : {
        type : String,
        default : defaultImageUrl,
        set : (v) => !v || !v.trim()
        ? defaultImageUrl
        : v,
    },
}, { _id : false });

const listingSchema = new Schema({
    title : {
        type : String,
        required : true,
    },
    description : {
        type : String,
    },
    image : {
        type : imageSchema,
        default : () => ({}),
    },
    price : {
        type : Number,
    },
    location : {
        type : String,
    },
    country : {
        type : String,
    },
});


const listing = mongoose.model('listing', listingSchema);

module.exports = listing;