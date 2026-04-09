const mongoose = require('mongoose');
const reviews = require('./reviews');
const { cloudinary } = require('../cloudConfig');

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
        required : [true, "Title is required"],
        trim : true,
        minlength : [3, "Title must be at least 3 characters long"],
    },
    description : {
        type : String,
        required : [true, "Description is required"],
        trim : true,
        minlength : [10, "Description must be at least 10 characters long"],
    },
    image : {
        type : imageSchema,
        default : () => ({}),
    },
    price : {
        type : Number,
        required : [true, "Price is required"],
        min : [0, "Price cannot be negative"],
        cast : "Price must be a valid number",
    },
    location : {
        type : String,
        required : [true, "Location is required"],
        trim : true,
    },
    country : {
        type : String,
        required : [true, "Country is required"],
        trim : true,
    },
    geometry: {
        type: {
            type: String,
            enum: ['Point'],
        },
        coordinates: {
            type: [Number],
            default: undefined,
        },
    },
    mapDisplayName: {
        type: String,
        trim: true,
    },
    reviews : [
        {
            type : Schema.Types.ObjectId,
            ref : 'Review',
        }
    ],
    owner: {
        type: Schema.Types.ObjectId,
        ref: 'User',
    },
});


listingSchema.post('findOneAndDelete', async(listing) =>{
    if (listing) {
        if (listing.image && listing.image.filename && listing.image.filename !== 'listingimage') {
            await cloudinary.uploader.destroy(listing.image.filename);
        }
        await reviews.deleteMany({
            _id : {
                $in : listing.reviews,
            },
        });
    }
})

const listing = mongoose.model('listing', listingSchema);

module.exports = listing;
