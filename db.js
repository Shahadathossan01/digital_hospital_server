const mongoose=require('mongoose')

const connectDB=(str)=>{
    return mongoose.connect(str)
}

module.exports=connectDB;