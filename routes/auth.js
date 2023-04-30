const express = require('express');

const router = express.Router();

const {
    registerUser,
    loginUser,
    forgotPassword,
    resetPassword,
    logout
} = require('../controller/authController');

const { isAuthenticatedUser } = require('../middlewares/auth');

router.route('/user/register').post(registerUser);
router.route('/user/login').post(loginUser);
router.route('/user/logout').post(isAuthenticatedUser, logout);
router.route('/password/forgot').post(forgotPassword);
router.route('/password/reset/:token').put(resetPassword);

module.exports = router;