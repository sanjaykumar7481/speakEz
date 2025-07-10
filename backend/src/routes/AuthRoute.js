const express = require('express');
const AuthRouter = express.Router();

const {Login,Register,ForgetPassword} = require('../controllers/AuthController')

AuthRouter.post('/login',Login);
AuthRouter.post('/register',Register);
AuthRouter.post('/ForgetPassword',ForgetPassword);

module.exports = AuthRouter;
