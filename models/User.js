const mongoose=require('mongoose')
const {Schema,model}=mongoose
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken');
const crypto = require("crypto");
const UserSchema=new Schema({
    username:String,
    credential:{
        type: String,
        unique:true
    },
    password:String,
    accountVerified: { type: Boolean, default: false },
    verificationCode: Number,
    verificationCodeExpire: Date,
    resetPasswordToken: String,
    resetPasswordExpire: Date,
    createdAt: {
    type: Date,
    default: Date.now,
    },
    role:{
        type:String,
        default:'patient'
    }
})

UserSchema.pre("save",async function(next){
    if(!this.isModified("password")){
        next()
    }
    this.password=await bcrypt.hash(this.password,10)
})
UserSchema.methods.comparePassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
  };

UserSchema.methods.generateVerificationCode=function(){
    function generateRandomFiveDigitNumber(){
        const firstDigit=Math.floor(Math.random() *9)+1
        const remainingDigits=Math.floor(Math.random() *10000)
        .toString()
        .padStart(4,0)

        return parseInt(firstDigit + remainingDigits)
    }
    const verificationCode=generateRandomFiveDigitNumber();
    this.verificationCode=verificationCode;
    this.verificationCodeExpire=Date.now() + 10 * 60 * 1000;

    return verificationCode
}
UserSchema.methods.generateToken = function () {
    return jwt.sign({ id: this._id }, process.env.JWT_SECRET_KEY);
};

UserSchema.methods.generateResetPasswordToken = function () {
    const resetToken = crypto.randomBytes(20).toString("hex");
  
    this.resetPasswordToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");
  
    this.resetPasswordExpire = Date.now() + 15 * 60 * 1000;
  
    return resetToken;
  };



const User=model('User',UserSchema)

module.exports=User