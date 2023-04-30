const express = require('express');

const router = express.Router();

const {
    getUserProfile,
    updatePassword,
    updateUser,
    deleteUser,
    getAppliedJobs,
    getPublishedJobs,
    getUsers,
    deleteUserAdmin
} = require('../controller/userController');

const { isAuthenticatedUser, authorizeRoles } = require('../middlewares/auth');

router.use(isAuthenticatedUser);
router.route('/profile').get(getUserProfile);
router.route('/password/update').put(updatePassword);
router.route('/me/update').put(updateUser);
router.route('/me/delete').delete(deleteUser);
router.route('/jobs/applied').get(authorizeRoles('user'), getAppliedJobs);
router.route('/jobs/published').get(authorizeRoles('employer', 'admin'), getPublishedJobs);

// admin role only
router.route('/users').get(authorizeRoles('admin'), getUsers);
router.route('/users/:id').delete(authorizeRoles('admin'), deleteUserAdmin);

module.exports = router;