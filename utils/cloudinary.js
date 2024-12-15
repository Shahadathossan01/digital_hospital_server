const cloudinary = require('cloudinary').v2;
const fs = require('fs');

cloudinary.config({ 
    cloud_name: 'dmel68anu', 
    api_key: '751778973682883', 
    api_secret: 'JPxuWS28kfde0MkC65IiZO_rz9g'
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