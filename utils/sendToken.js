const sendToken = (user, statusCode, message, res) => {
    const token = user.generateToken();
    const payload={
    _id:user?._id,
    username:user?.username,
    credential:user?.credential,
    role:user?.role,
    accountVerified:user?.accountVerified
    }
    res
      .status(statusCode)
      .json({
        success: true,
        user:payload,
        message,
        token,
      });
  };

  module.exports=sendToken