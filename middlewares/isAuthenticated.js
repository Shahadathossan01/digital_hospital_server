const User = require("../models/User");
const error = require("../utils/error")
const jwt = require('jsonwebtoken');
const isAuthenticated=async(req,_res,next)=>{
    console.log(req.headers.authorization)
    try {
		let token = req.headers.authorization;
		if (!token) {
			return next(error("Invalid Token",400))
		}
		token = token.split(' ')[1];
		const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
		const user = await User.findById(decoded.id);

		if (!user) {
			return next(error("Unauthorized",400))
		}

		req.user = user;
		next();
	} catch (e) {
		next(e)
	}

}

module.exports=isAuthenticated;