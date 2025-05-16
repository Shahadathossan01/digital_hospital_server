const cloudinary = require('cloudinary').v2;
const fs = require('fs');
require('dotenv').config()

cloudinary.config({ 
    cloud_name:process.env.CLOUD_NAME, 
    api_key:process.env.CLOUD_API_KEY, 
    api_secret:process.env.CLOUD_API_SECRET
});

const uploadOnCloudinary=async(localFilePath)=>{
    try{
        if(!localFilePath) return null
        //upload the file on cloudinary
        const response=await cloudinary.uploader.upload(localFilePath,{
            resource_type:"auto"
        })
        fs.unlinkSync(localFilePath)
        return response
    }catch(error){
        fs.unlinkSync(localFilePath) // remove the locally saved temporary file as the upload operation got failed
        return null
    }
}

module.exports=uploadOnCloudinary;