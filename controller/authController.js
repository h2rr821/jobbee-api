const User = require('../models/users');
const catchAsyncErrors = require('../middlewares/catchAsyncErrors');
const ErrorHandler = require('../utils/errorHander');
const sendToken = require('../utils/jwtToken');
const sendEmail = require('../utils/sendEmail');
const crypto = require('crypto');

// Register a new user => /api/v1/user/register
exports.registerUser = catchAsyncErrors(async (req, res, next) => {

    const {name, email, role, password} = req.body;

    const user = await User.create({
        name,
        email,
        password,
        role
    });

    // // Create jwt token
    // const token = user.getJwtToken();
    // console.log('token: ', token);

    // res.status(200).json({
    //     success: true,
    //     message: 'User is register',
    //     token
    // });
    sendToken(user, 200, res);
});

// Login user => /api/v1/user/login
exports.loginUser = catchAsyncErrors(async (req, res, next) => {

    const {email, password} = req.body;

    if (!email || !password) {
        return next(new ErrorHandler('Please enter email or password', 400));
    }

    // find user in database
    const user = await User.findOne({email}).select('+password');

    if (!user) {
        return next(new ErrorHandler('Invalid email or password', 401));
    }

    // Check if password is correct
    const isPasswordMatched = await user.comparePassword(password);

    if (!isPasswordMatched) {
        return next(new ErrorHandler('Invalid email or password', 401));
    }

    // const token = user.getJwtToken();

    // res.status(200).json({
    //     success: true,
    //     token
    // });
    sendToken(user, 200, res);

});

// Forgot password => api/v1/password/forgot
exports.forgotPassword = catchAsyncErrors( async (req, res, next) => {

    const user = await User.findOne({email: req.body.email});

    // check user email is in database
    if (!user) {
        return next(new ErrorHandler('No user found with this email', 404)); 
    }

    // get reset token
    const resetToken = user.getResetPasswordToken();

    await user.save({ validateBeforeSave: false });

    // Create reset password url
    const resetUrl = `${req.protocol}://${req.get('host')}/api/v1/password/reset/${resetToken}`;

    const message = `Your password reset link is as follow: \n\n ${resetUrl} \n\n 
        If you have not request this, then please ignore that.`;

    try {

        await sendEmail({
            email: user.email,
            subject: 'Password reset email',
            message
        });
    
        res.status(200).json({
            success: true,
            message: `Email send successfully to ${user.email}`
        });

    } catch (error) {

        user.resetPasswordToken = undefined;
        user.resetPasswordExpire = undefined;

        await user.save({
            validateBeforeSave: false
        });

        return next(new ErrorHandler('Email is not send', 500)); 
    }
});

// reset password => api/v1/password/reset/:token
exports.resetPassword = catchAsyncErrors( async (req, res, next) => {
    // Hash url token

    console.log("token: ", req.params.token);
    const resetPasswordToken = crypto.createHash('sha256')
                                    .update(req.params.token)
                                    .digest('hex');

    console.log('resettoken: ', resetPasswordToken);
 
    const user = await User.findOne({
        resetPasswordToken,
        resetPasswordExpire: {$gt: Date.now() }
    });

    if (!user) {
        return next(new ErrorHandler('Password reset token is invalid or has been expired', 400)); 
    }

    // setup new password
    user.password = req.body.password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;

    await user.save();

    sendToken(user, 200, res);

});

// Logout user => /api/v1/user/logout
exports.logout = catchAsyncErrors( async (req, res, next) => {
    res.cookie('token', 'none', {
        expires: new Date(Date.now()),
        httpOnly: true
    });

    res.status(200).json({
        success: true,
        message: 'Logged out successfully'
    });
});