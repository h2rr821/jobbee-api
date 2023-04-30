// Create and send token and save in cookies
const sendToken = (user, statusCode, res) => {
    // Create jwt token
    const token = user.getJwtToken();

    // options for cookies
    const options = {
        expires: new Date(Date.now() + process.env.COOKIES_EXPIRES_TIME * 24*60*60*1000),
        httpOnly: true
    };

    if (process.env.NODE_ENV === 'production ') {
        options.secure = true;
    }

    res.status(statusCode)
        .cookie('token', token, options)
        .json({
            success: true,
            token
        });
};

module.exports = sendToken;