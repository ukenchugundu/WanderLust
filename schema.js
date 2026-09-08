const Joi = require('joi');

module.exports.listingSchema = Joi.object({
    title: Joi.string().trim().min(3).required().messages({
        'string.empty': 'Title is required',
        'string.min': 'Title must be at least 3 characters long',
        'any.required': 'Title is required',
    }),
    description: Joi.string().trim().min(10).required().messages({
        'string.empty': 'Description is required',
        'string.min': 'Description must be at least 10 characters long',
        'any.required': 'Description is required',
    }),
    price: Joi.number().min(0).required().messages({
        'number.base': 'Price must be a valid number',
        'number.min': 'Price cannot be negative',
        'any.required': 'Price is required',
    }),
    location: Joi.string().trim().required().messages({
        'string.empty': 'Location is required',
        'any.required': 'Location is required',
    }),
    country: Joi.string().trim().required().messages({
        'string.empty': 'Country is required',
        'any.required': 'Country is required',
    }),
    imageUrl: Joi.string().uri().allow('').optional(),
    latitude: Joi.alternatives()
        .try(Joi.number(), Joi.string().trim().allow(''))
        .optional(),
    longitude: Joi.alternatives()
        .try(Joi.number(), Joi.string().trim().allow(''))
        .optional(),
    mapDisplayName: Joi.string().trim().allow('').optional(),
});


module.exports.reviewSchema = Joi.object({
    review: Joi.object({
        rating: Joi.number().required().min(1).max(5).messages({
            'number': 'Rating must be a valid number',
        }),
        comment: Joi.string().required().messages({
            'string.empty': 'Comment is required',
        }),
    }),
})
