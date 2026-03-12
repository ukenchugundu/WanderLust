const mongoose = require('mongoose');

const Schema = mongoose.Schema;
const defaultImageUrl = "https://images.unsplash.com/photo-1580587772039-8f66e15d3243?ixlib=rb-4.0.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1200&q=80";

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