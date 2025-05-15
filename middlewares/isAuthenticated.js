const User = require("../models/User");
const error = require("../utils/error")
const jwt = require('jsonwebtoken');
const isAuthenticated=async(req,_res,next)=>{
	let token = req.headers.authorization;

	token = token?.split(' ')[1];
	
	if (!token) {
		return next(error("Authentication failed",400))
	}
    try {
		const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
		const user = await User.findById({_id:decoded.id});

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