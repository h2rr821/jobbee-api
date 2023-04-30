const Job = require('../models/jobs');
const geoCoder = require('../utils/geocoder');
const ErrorHandler = require('../utils/errorHander');
const catchAsyncErrors = require('../middlewares/catchAsyncErrors');
const APIFilters = require('../utils/apiFilter');
const path = require('path');
const fs = require('fs');

// get all jobs =>  /api/v1/jobs
exports.getJobs = catchAsyncErrors(async (req, res, next) => {

    const apiFilter = new APIFilters(Job.find(), req.query).filter()
                                    .sort().limitFields().searchByQuery().pagination();
   
    const jobs = await apiFilter.query;

    // const jobs = await Job.find();
    
    res.status(200).json({
        success: true,
        results: jobs.length,
        data: jobs
        // message: 'This route will dispay all jobs in the future'
    });
});

// get a single job with id and slug => /api/v1/job/:id/:slug
exports.getJob = catchAsyncErrors(async (req, res, next) => {
    // const job = await Job.findById(req.params.id);
    const job = await Job.find({$and:[{_id: req.params.id}, {
        slug: req.params.slug
    }]}).populate({
        path: 'user',
        select: 'name'
    });

    if (!job || job.length === 0) {
        // return res.status(404).json({
        //     success: false,
        //     message: 'Job not found'
        // });
        return next(new ErrorHandler('Job not found', 404));
    }

    res.status(200).json({
        success: true,
        data: job
    });
});


// create a new job => /api/v1/job/new
exports.newJob = catchAsyncErrors (async (req, res, next) => {

    console.log(req.body);

    // adding user to body
    req.body.user = req.user.id;
    
    const job = await Job.create(req.body);

    res.status(200).json({
        success: true,
        message: 'Job Created',
        data: job
    })
});

// update a job => /api/v1/job/:id
exports.updateJob = catchAsyncErrors(async (req, res, next) => {
    let job = await Job.findById(req.params.id);
    
    if (!job) {
        
        // return res.status(404).json({
        //     success: false,
        //     message: 'Job not found'
        // });
        return next(new ErrorHandler('Job not found', 404));
    }

    // Check if the user is owner
    console.log('job creator: ', job.user.toString());
    console.log('user try to update: ', req.user.id);
    if (job.user.toString() !== req.user.id && req.user.role !== 'admin') {
        return next(new ErrorHandler(`User(${req.user.id}) is not allowed to update this job`, 401));
    }

    job = await Job.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true
    });

    res.status(200).json({
        success: true,
        message: 'Job is updated',
        data: job
    });

});

// Delete a job => /api/v1/job/:id
exports.deleteJob = catchAsyncErrors(async (req, res, next) => {

    let job = await Job.findById(req.params.id).select('+applicantsApplied');
    
    if (!job) {
        
        // return res.status(404).json({
        //     success: false,
        //     message: 'Job not found'
        // });
        return next(new ErrorHandler('Job not found', 404));
    }

    // Check if the user is owner
    if (job.user.toString() !== req.user.id && req.user.role !== 'admin') {
        return next(new ErrorHandler(`User(${req.user.id}) is not allowed to delete this job`, 401));
    }

    for(let i=0; i<job.applicantsApplied.length; i++) {
        let filepath = `${__dirname}/public/uploads/${job.applicantsApplied[i].resume}`.replace('\\controller', '');

        fs.unlink(filepath, err => {
            if (err) return console.log(err);
        })
    }

    job = await Job.findByIdAndRemove(req.params.id);

    res.status(200).json({
        success: true,
        message: 'Job is deleted',
    });

});

// Search jobs with radius => /api/v1/jobs/:zipcode/:ditance
exports.getJobsInRadius = catchAsyncErrors(async (req, res, next) => {

    const {zipcode, distance} = req.params;

    // get lat & lng from geocoder with zipcode
    const loc = await geoCoder.geocode(zipcode);
    // coordinates: [loc[0].longitude, loc[0].latitude],
    const latitude = loc[0].latitude;
    const longitude = loc[0].longitude;

    const radius = distance / 3963;
    const jobs = await Job.find({
        location: { $geoWithin: {$centerSphere: [[longitude,latitude], radius]}}
    });

    res.status(200).json({
        success: true,
        results: jobs.length,
        data: jobs
    });
});

// Get stats about a topic(job) => /api/v1/stats/:topic
exports.jobStats = catchAsyncErrors(async (req, res, next) => {
    const stats = await Job.aggregate([
        {
            $match: {$text: {$search: "\"" + req.params.topic + "\""}}
        }, 
        {
            $group: {
                _id: {$toUpper: '$experience'},
                totalJobs: {$sum: 1},
                avgPosition: {$avg: '$positions'},
                avgSalary: {$avg: '$salary'},
                minSalary: {$min: '$salary'},
                maxSalary: {$max: '$salary'}
            }
        }
    ]);

    if (stats.length === 0) {

        return next(new ErrorHandler(`No stats found for - ${req.params.topic}`, 200));
        // return res.status(200).json({
        //     success: false,
        //     message: `No stats found for - ${req.params.topic}`
        // });
    }

    res.status(200).json({
        success: true,
        data: stats
    });
});

// apply to job using resume =>  /api/v1/job/:id/apply
exports.applyJob = catchAsyncErrors(async (req, res, next) => {

    console.log(req.params.id);
    let job = await Job.findById(req.params.id).select('+applicantsApplied');

    console.log('job: ', job);
    console.log('user name: ', req.user.name);

    if (!job) {
        return next(new ErrorHandler('Job not found', 404));
    }

    // Check that if job last date has been passed or not
    if (job.lastDate < new Date(Date.now())) {
        return next(new ErrorHandler('You cannot apply this job, date is over', 400));
    }

    // Check if user has applyed before
    for (let i=0; i<job.applicantsApplied.length; i++) {
        if (job.applicantsApplied[i].id === req.user.id) {
            return next(new ErrorHandler('You have already applied for this job', 400));
        }
    }

    // check the file
    if (!req.files) {
        return next(new ErrorHandler('Please upload file', 400));
    }

    const file = req.files.file;

    // check file type
    const supportedFiles = /.docs|.pdf/;
    
    if (!supportedFiles.test(path.extname(file.name))) {
        return next(new ErrorHandler('Please upload document file', 400));
    }

    // Check document size
    if (file.size > process.env.MAX_FILE_SIZE) {
        return next(new ErrorHandler('Please upload file less than 2MB', 400));
    }

    // renaming the resume
    file.name = `${req.user.name.replace(' ', '_')}_${job._id}${path.parse(file.name).ext}`;

    file.mv(`${process.env.UPLOAD_PATH}/${file.name}`,  async err => {
        if (err) {
            console.log(err);
            return next(new ErrorHandler('Please upload failed', 500));
        }

        await Job.findByIdAndUpdate(req.params.id, {$push: {
            applicantsApplied: {
                id: req.user.id,
                resume: file.name
            }
        }}, {
            new: true,
            runValidators: true,
            useFindAndModify: false
        });

        res.status(200).json({
            success: true,
            message: 'Applied to job successfully',
            data: file.name
        });

    });
});