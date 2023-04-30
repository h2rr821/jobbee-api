const mongoose = require('mongoose');
const validator = require('validator');
const slugify = require('slugify');
const geocoder = require('../utils/geocoder');

const jobSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Please enter job title'],
        trim: true,
        maxlength: [100, 'Job title cannot exceed 100 characters']
    },
    slug: String,
    description: {
        type: String,
        required: [true, 'Please enter job description'],
        maxlength: [1000, 'Job description cannot exceed 1000 characters']
    },
    email: {
        type: String,
        validate: [validator.isEmail, 'Please add a valid email address']
    },
    address: {
        type: String,
        required: [true, 'Please add an address']
    },
    location: {
        type: {
            type: String,
            enum: ['Point']
        },
        coordinates: {
            type: [Number],
            index: '2dsphere'
        },
        formattedAddress: String,
        city: String,
        state: String,
        zipcode: String,
        country: String
    },
    company: {
        type: String,
        required: [true, 'Please add company name']
    },
    industry: {
        type: [String],
        required: [true, 'Please enter industry for this job'],
        enum: {
            values: [
                'Business',
                'Information Technology',
                'Banking',
                'Education/Training',
                'Telecommunication',
                'Others'
            ],
            message: 'Please select correct options for industry'
        }
    },
    jobType: {
        type: String,
        required: [true, 'Please enter job type'],
        enum: {
            values: [
                'Permanent',
                'Temporary',
                'Internship',
            ],
            message: 'Please select correct options for job type'
        }
    },
    minEducation: {
        type: String,
        required: [true, 'Please enter min education'],
        enum: {
            values: [
                'Bachelors',
                'Masters',
                'Phd',
            ],
            message: 'Please select correct options for education'
        }
    },
    positions: {
        type: Number,
        default: 1
    },
    experience: {
        type: String,
        required: [true, 'Please enter experience'],
        enum: {
            values: [
                'No Experience',
                '1 year - 2 year',
                '2 year - 5 year',
                '5 years+'
            ],
            message: 'Please select correct options for experience'
        }
    },
    salary: {
        type: Number,
        required: [true, 'Please enter expected salary for this job']
    },
    postingDate: {
        type: Date,
        default: Date.now
    },
    lastDate: {
        type: Date,
        default: new Date().setDate(new Date().getDate() + 7)
    },
    applicantsApplied: {
        type: [Object],
        select: false
    },
    user: {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
        required: true
    }
});

// create job slug before saving
jobSchema.pre('save', function(next) {
    // create slug before saving to db
    this.slug = slugify(this.title, {lower: true});
    next();
});

// Setting up location 
jobSchema.pre('save', async function(next) {
    // create location before saving to db
    const loc = await geocoder.geocode(this.address);
    // console.log('loc: ', loc);
    this.location = {
        type: 'Point',
        coordinates: [loc[0].longitude, loc[0].latitude],
        formattedAddress: loc[0].formattedAddress,
        city: loc[0].city,
        state: loc[0].stateCode,
        zipcode: loc[0].zipcode,
        country: loc[0].countryCode
    }
    next();
});

module.exports = mongoose.model('Job', jobSchema);
