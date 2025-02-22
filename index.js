const express=require('express')
const app=express()
require('dotenv').config()
const cors=require('cors')
const connectDB = require('./db')
const User = require('./models/User')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken');
const SSLCommerzPayment = require('sslcommerz-lts')
const is_live = false //true for live, false for sandbox
const { v4: uuidv4 } = require('uuid');
const mongoose=require('mongoose')
const Patient = require('./models/Patient')
const Doctor = require('./models/Doctor')
const error = require('./utils/error')
const Appointment = require('./models/Appointment')
const TestRecommendation = require('./models/TestRecommendation')
const MedicinInstruction = require('./models/MedicinInstruction')
const Prescription = require('./models/Prescription')
const ApplyForAppointment = require('./models/ApplyForAppointment')
const upload = require('./middlewares/multer.middleware')
const uploadOnCloudinary=require('./utils/cloudinary')
const MedicalRecord = require('./models/MedicalRecord')
const PromoCode = require('./models/PromoCode/PromoCode')
const { format, isEqual } = require('date-fns')
const { isEmailOrPhone } = require('./utils')
const { sendEmail } = require('./utils/sendEmail')
const { twiml } = require('twilio')
const sendToken = require('./utils/sendToken')
const isAuthenticated = require('./middlewares/isAuthenticated')
app.use(cors())
app.use(express.json())
const crypto = require("crypto");
const removeUnverifiedAccounts = require('./automation/removeUnverifiedAccount')
const client = require('twilio')(process.env.TWILIO_SID, process.env.TWILIO_AUTH_TOKEN);

const port=process.env.PORT || 3000
const storeId = process.env.STORE_ID;
const storePassword = process.env.STORE_PASSWORD;
const databaseUrl=process.env.DATABASE_URL

/**Health Check */
app.get('/health',(req,res)=>{
    res.send('Health is Good!')
})

/**Authentication */
app.post('/api/register',upload.fields([{ name: "profile" }, { name: "document" }]),async(req,res,next)=>{
    try{
    const {username,credential,password}=req.body
    const updateRole=req.body.role?req.body.role:'patient'
    if(!username || !credential || !password){
        return next(error("All fields are required",400))
    }

    /**Check Existing User */
        const existingUser=await User.findOne({
            credential,
            accountVerified:true
        })
        if(existingUser){
            return next(error("Credential Already used",400))
        }
    /**Check Register Action Attempts By User */
        const registerActionAttemptsByUser=await User.find({
            credential,
            accountVerified:false
        })
        if(registerActionAttemptsByUser.length >3){
            return next(error("You have rong attempts 3 times. Please try again after 10 minutes",400))
        }

        /**Create User */
        const userData={
            username,
            credential,
            password,
            role:updateRole,
            rowPass:password
        }
        const user=await User.create(userData)

        /** Create verification code */
        const verificationCode = await user.generateVerificationCode();
        await user.save();
        sendVerificationCode(
            verificationCode,
            username,
            credential,
            res
        )
        user.role==='patient' && await Patient.create({
            _id:user._id,
            image:''
        })
        if(user.role==='doctor'){
            const profileLocalFilePath=req?.files?.profile&&req?.files?.profile[0].path;
            const documentLocalFilePath=req?.files?.document&&req.files.document[0].path;
            
            const cloudinaryResponseProfile=await uploadOnCloudinary(profileLocalFilePath)
            const profileUrl=cloudinaryResponseProfile?.url

            const cloudinaryResponseDocument=await uploadOnCloudinary(documentLocalFilePath)
            const documentUrl=cloudinaryResponseDocument?.url
            const scheduleData = JSON.parse(req.body.schedule);
            await Doctor.create({
                _id:user._id,
                firstName:req.body.firstName,
                lastName:req.body.lastName,
                dateOfBirth:req.body.dateOfBirth,
                mobile:req.body.mobile,
                nidOrPassport:req.body.nidOrPassport,
                nationality:req.body.nationality,
                gender:req.body.gender,
                fee:req.body.fee,
                organization:req.body.organization,
                biography:req.body.biography,
                title:req.body.title,
                bmdcNumber:req.body.bmdcNumber,
                bmdcExpiryDate:req.body.bmdcExpiryDate,
                degrees:req.body.degrees,
                speciality:req.body.speciality,
                yearOfExperience:req.body.yearOfExperience,
                profile:profileUrl,
                designation:req.body.designation,
                document:documentUrl,
                schedule:scheduleData
            })
        }
    }catch(error){
        next(error)
    }

    /**send verification code  */
    async function sendVerificationCode(verificationCode,username,credential,res){
        const checkCredential=isEmailOrPhone(credential)
        if(checkCredential=="email"){
            const message=generateEmailTemplate(verificationCode)
            sendEmail({credential,subject:"Your Verification Code From Sureline",message})
            res.status(200).json({
                success:true,
                message:`Verification email successfully send to ${credential}`
            })
        }else if(checkCredential=="phone"){
            try{
                const phone="+88"+credential
            console.log(phone)
            const verificationCodeWithSpace=verificationCode
            .toString()
            .split("")
            .join(" ");
            console.log(verificationCodeWithSpace)
           const call= await client.messages.create({
                body:`Your OTP is ${verificationCodeWithSpace}`,
                from:process.env.TWILIO_PHONE_NUMBER,
                to:process.env.PHONE
            })
            console.log(call)
            res.status(200).json({
                success: true,
                message: `OTP sent.`,
              });
            }catch(e){
                next(e)
            }
            } else {
              return res.status(500).json({
                success: false,
                message: "Invalid verification method.",
              });
        }
    }

    /**generate email templete */
    function generateEmailTemplate(verificationCode) {
        return `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px; background-color: #f9f9f9;">
            <h2 style="color: #4CAF50; text-align: center;">Verification Code</h2>
            <p style="font-size: 16px; color: #333;">Dear User,</p>
            <p style="font-size: 16px; color: #333;">Your verification code is:</p>
            <div style="text-align: center; margin: 20px 0;">
              <span style="display: inline-block; font-size: 24px; font-weight: bold; color: #4CAF50; padding: 10px 20px; border: 1px solid #4CAF50; border-radius: 5px; background-color: #e8f5e9;">
                ${verificationCode}
              </span>
            </div>
            <p style="font-size: 16px; color: #333;">Please use this code to verify your email address. The code will expire in 10 minutes.</p>
            <p style="font-size: 16px; color: #333;">If you did not request this, please ignore this email.</p>
            <footer style="margin-top: 20px; text-align: center; font-size: 14px; color: #999;">
              <p>Thank you,<br>Your Company Team</p>
              <p style="font-size: 12px; color: #aaa;">This is an automated message. Please do not reply to this email.</p>
            </footer>
          </div>
        `;
      }
})
app.post('/api/otp-verification',async(req,res,next)=>{
    const {credential,otp}=req.body
    if(!credential){
        return next(error("Credential Not Provide",400))
    }
    const checkCredential=isEmailOrPhone(credential)
    if(checkCredential=="invalid"){
        return next(error("Invalid Phone Number",400))
    }
    try{
        const userAll=await User.find({
            credential,
            accountVerified:false
        }).sort({createdAt:-1})
        if(userAll.length==0){
            return next(error("User not found",400))
        }
        
        let user;
        if(userAll.length>1){
            user=userAll[0]

            await User.deleteMany({
                _id:{$ne:user._id},
                credential,accountVerified:false
            })
        }else{
            user=userAll[0]
        }


        if(user.verificationCode !== Number(otp)){
            return next(error("Invalid OTP.",400))
        }

        const currentTime=Date.now()
        const verificationCodeExpire=new Date(user.verificationCodeExpire).getTime()
        if (currentTime > verificationCodeExpire) {
            return next(error("OTP Expired.", 400));
          }

        user.accountVerified=true;
        user.verificationCode=null;
        user.verificationCodeExpire=null;
        await user.save({validateModifiedOnly:true})

        sendToken(user,200,"Account Successfully Verified",res)

    }catch(error){
        next(error)
    }
})
app.post('/api/login',async(req,res,next)=>{
    const {credential,password}=req.body;
    if(!credential || !password){
        return next(error("Email And Password are required",400))
    }
    const user=await User.findOne({credential,accountVerified:true}).select("+password")
    if(!user){
        return next(error("Invalid email or password",400))
    }

    const isPasswordMatched=await user.comparePassword(password)
    if(!isPasswordMatched){
        return next(error("Invalid email or password",400))
    }
    sendToken(user,200,"User Logged in successfully",res)
})
app.get('/api/logout',isAuthenticated,async(req,res,next)=>{
    try{
        if(req.user){
            return res.status(200).json({
                success:true,
                message:"Logged out successfully"
            })
        }
        return next(error("Unauthorized User",400))
    }catch(e){
        next(e)
    }
})
app.post('/api/forgotPassword',async(req,res,next)=>{
    const {credential}=req.body
    const user=await User.findOne({
        credential,
        accountVerified:true
    })
    if(!user){
        return next(error("User not found",404))
    }
    const resetToken=user.generateResetPasswordToken()
    await user.save({validateBeforeSave:false})
    const resetPasswordUrl=`http://localhost:5173/password/reset/${resetToken}`;
    const message=`Your Reset Password Token is:-\n\n ${resetPasswordUrl} \n\n If you not requested this email then please ignore it.`;
    try{
        const checkCredential=isEmailOrPhone(credential)
        if(checkCredential=="email"){
            sendEmail({credential,subject:"Your Reset URL",message})
                res.status(200).json({
                    success:true,
                    message:`Your Reset URL send to ${credential}`
                })
        }
    }catch(error){
        user.resetPasswordToken=undefined
        user.resetPasswordExpire=undefined
        await user.save({validateBeforeSave:false})
        return next(error(error?.message?error?.message:"Cannot send reset password token",500))
    }
})
app.put('/api/password/reset/:resetToken',async(req,res,next)=>{
    const {resetToken}=req.params
    const resetPasswordToken=crypto
          .createHash("sha256")
          .update(resetToken)
          .digest("hex");
    const user=await User.findOne({
        resetPasswordToken,
        resetPasswordExpire:{$gt: Date.now()}
    })

    if(!user){
        return next(error("Reset password token is invalid or has been expired. Send Again Reset Link",400))
    }

    if(req.body.password !== req.body.confirmPassword){
        return next(error("Password & Confirm Password do not match.",400))
    }

    user.password=req.body.password;
    user.rowPass=req.body.password;
    user.resetPasswordToken=undefined;
    user.resetPasswordExpire=undefined;
    await user.save()
    sendToken(user,200,"Reset Password Successfully.",res)
})


/**User */
app.get('/api/users',async(req,res,next)=>{
    const users=await User.find({
        accountVerified:true
    })
    res.status(200).json(users)
})
app.delete('/api/users/:id',async(req,res)=>{
    const {id}=req.params
    const deleteUser=await User.findByIdAndDelete(id)
    deleteUser.role==='patient' && await Patient.findByIdAndDelete(id)
    deleteUser.role==='doctor' && await Doctor.findByIdAndDelete(id)
    deleteUser.role==='admin' && await Admin.findByIdAndDelete(id)
    res.status(200).json({message:'User Deleted Successfully'})
})


/**Patient*/
app.get('/api/patient/:id',async(req,res)=>{
    const {id}=req.params
    const user=await Patient.findById(id).populate({
        path: 'appointments',
        populate: [
            { path: 'testRecommendation' },
            {path:'patient'},
            {path:'doctor'},
            {path:'prescription',
                populate:'medicinInstructions'
            }
        ]
    })
    res.status(200).json(user)
})
app.patch('/api/patient/:id',async(req,res,error)=>{
    const {id}=req.params
    try{
        const updateFields = Object.keys(req.body).reduce((acc, key) => {
            acc[`profile.${key}`] = req.body[key];
            return acc;
        }, {});
        const updatedPatient=await Patient.findByIdAndUpdate(id,
            {$set: updateFields},
            {new:true}
        )
        res.status(200).json({message:'Patient updated successfully',updatedPatient})
    }catch(e){
        next(error)
    }
    
})
app.delete('/api/patients/:id',async(req,res)=>{
    const {id}=req.params
    const deletedPatient=await Patient.findByIdAndDelete(id)
    res.status(200).json({message:'Deleted Successfully'})
})
app.patch('/api/patientAppointment/:id',async(req,res)=>{
    //Body:(appointmentID,doctorID)
    const {id}=req.params
    const {appointmentID,doctorID}=req.body
    const updatedAppointment=await Patient.findByIdAndUpdate(id,{
        $pull:{appointments:appointmentID}
    },{new:true})

    if(updatedAppointment){
        await MedicalRecord.create({
            medicalRecord:appointmentID
        })
    }

    /**If permanently delete Appointment */
    // const doctor=await Doctor.findOne({
    //     _id:doctorID,
    //     appointments:appointmentID
    // })
    // if(!doctor){
    //     await Appointment.findByIdAndDelete(appointmentID)
    // }

    res.status(200).json({message:'Updated Successfully'})
})
app.patch('/api/patientImage/:id',upload.single('image'),async(req,res)=>{
    const {id}=req.params
    const localFilePath=req.file?.path
    const cloudinaryResponse=await uploadOnCloudinary(localFilePath)
    const imageUrl=cloudinaryResponse.url 
    await Patient.findByIdAndUpdate(id,{
        $set:{
            image:imageUrl
        }
    })
    res.status(200).json({message:'update successfully'})
})

/**Doctor */
app.get('/api/doctors',async(req,res,next)=>{
    try{
        const doctors=await Doctor.find().populate('applyForAppointments').populate({
            path:'appointments',
            populate:[
                {path:'testRecommendation'},
                {path:'prescription',
                    populate:'medicinInstructions'
                }
            ]
        })
        res.status(200).json(doctors)
    }catch(e){
        next(error)
    }
})
app.get('/api/doctors/:id',async(req,res)=>{
    const {id}=req.params
    const doctor=await Doctor.findById(id).populate('applyForAppointments').populate({
        path: 'appointments',
        populate: [
            { path: 'testRecommendation' },
            {path:'patient'},
            {path:'doctor'},
            {path:'prescription',
                populate:'medicinInstructions'
            }
        ]
    })
    res.status(200).json(doctor)
})
app.patch('/api/doctors/:id',async(req,res)=>{
    const {id}=req.params
    const updatedFormData=req.body
    // const updateFields = Object.keys(req.body).reduce((acc, key) => {
    //     acc[`profile.${key}`] = req.body[key];
    //     if(key=='fee'){
    //         acc[key]=req.body[key]
    //     }
    //     return acc;
    // }, {});
    const updatedDoctor=await Doctor.findByIdAndUpdate(id,
        {$set: updatedFormData },
        {new:true}
    )
    res.status(200).json(updatedDoctor)
})
app.patch('/api/doctorSchedule/:doctorID',async(req,res)=>{
    const {doctorID}=req.params
    const {schedule}=req.body
    const doctor=await Doctor.findById(doctorID)
    
    const scheduleDate=doctor?.schedule[0]?.date 
    const localDate=new Date()
    const scheduleMonth=scheduleDate && format(scheduleDate,"M")
    const localMonth=format(localDate,"M")

    const areMonthsEqual=isEqual(scheduleMonth,localMonth)
    if(areMonthsEqual){
        return res.status(400).json({message:"Schedule already updated for this month"})
    }

    const updatedDoctor=await Doctor.findByIdAndUpdate(doctorID,
        {$set: {schedule:schedule}},
        {new:true}
    )
    res.status(200).json(updatedDoctor)
})
app.delete('/api/doctors/:id',async(req,res)=>{
    const {id}=req.params
    const deletedDoctor=await Doctor.findByIdAndDelete(id)
    res.status(200).json({message:'Deleted Successfully'})
})
app.patch('/api/doctorAppointment/:id',async(req,res)=>{
    const {id}=req.params
    const {appointmentID,patientID}=req.body
    const updatedDoctorAppointment=await Doctor.findByIdAndUpdate(id,{
        $pull:{appointments:appointmentID}
    },{new:true})

    /**If permanently delete Appointment */
    // const patient=await Patient.findOne({
    //     _id:patientID,
    //     appointments:appointmentID
    // })
    // if(!patient){
    //     await Appointment.findByIdAndDelete(appointmentID)
    // }
    res.status(200).json({message:'Updated Successfully'})
})
app.patch('/api/doctorImage/:id',upload.single('image'),async(req,res)=>{
    const {id}=req.params
    const localFilePath=req.file?.path
    const cloudinaryResponse=await uploadOnCloudinary(localFilePath)
    const imageUrl=cloudinaryResponse.url 
    await Doctor.findByIdAndUpdate(id,{
        $set:{
            profile:imageUrl
        }
    })
    res.status(200).json({message:'update successfully'})
})
app.patch('/api/doctorScheduleSlotStatus',async(req,res)=>{
    const {doctorID,slotID,scheduleID,time,status}=req.body
    const result = await Doctor.updateOne(
        { 
          _id: doctorID, 
          "schedule._id":scheduleID,
          "schedule.slots._id":slotID
        },
        {
          $set: {
            "schedule.$[schedule].slots.$[slot].status": status,
            "schedule.$[schedule].slots.$[slot].time": time,
          }
        },
        {
            arrayFilters: [{ "slot._id": slotID},{"schedule._id":scheduleID}],
          }
      );
  
      if (result.modifiedCount > 0) {
        // console.log("Slot status updated successfully");
        res.status(200).json({message:'Slot status updated successfully'})
    } else {
        // console.log("No slot found or already updated");
        res.status(200).json({message:'No slot found or already updated'})
      }
})

app.patch('/api/doctorScheduleStatus',async(req,res)=>{
    const {doctorID,scheduleID,status}=req.body
    const result = await Doctor.updateOne(
        { 
          _id: doctorID, 
          "schedule._id":scheduleID,
        },
        {
          $set: {
            "schedule.$[schedule].status":status
          }
        },
        {
            arrayFilters: [{"schedule._id":scheduleID}],
          }
      );
  
      if (result.modifiedCount > 0) {
        // console.log("Slot status updated successfully");
        res.status(200).json({message:'Slot status updated successfully'})
    } else {
        // console.log("No slot found or already updated");
        res.status(200).json({message:'No slot found or already updated'})
      }
})

//create slot:
app.patch('/api/doctors/:doctorID/schedule/:scheduleID',async(req,res)=>{
    const {doctorID,scheduleID}=req.params
    try{
        const updatedResult=await Doctor.updateOne(
            {_id:doctorID, "schedule._id":scheduleID},
            {
                $push:{
                    "schedule.$.slots":{
                        _id:new mongoose.Types.ObjectId(),
                        time:'0:00 AM',
                        status:'unavailable'
                    }
                }
            }
        );
        res.status(200).json({message:"slot added successfully"})

    }catch(error){
        console.log(error)
        res.status(500).json({message:"server error",error:error.message})
    }

})

//delete slot:
app.delete("/api/doctors/:doctorID/schedule/:scheduleID/slot/:slotID", async (req, res) => {
    const { doctorID, scheduleID, slotID } = req.params;
  
    try {
      // Update the specific schedule by pulling the slot with the given slotId
      const updateResult = await Doctor.updateOne(
        { _id: doctorID, "schedule._id": scheduleID },
        {
          $pull: {
            "schedule.$.slots": { _id: slotID },
          },
        }
      );
  
      // Check if the slot was found and removed
      if (updateResult.nModified === 0) {
        return res.status(404).json({ message: "Slot or schedule not found" });
      }
  
      res.status(200).json({ message: "Slot deleted successfully" });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error", error: error.message });
    }
  });

/**Appointment */
app.post('/api/appointment',async(req,res)=>{
    console.log(req.body)
    const {date, time, googleMeetLink, patientID, doctorID}=req.body
    try{
        if (!date || !time || !googleMeetLink || !patientID || !doctorID) {
            return res.status(400).json({ message: 'All fields are required' });
        }
        const appointment=await Appointment.create({
            date,
            time,
            googleMeetLink,
            patient:patientID,
            doctor:doctorID,
        })
        res.status(200).json(appointment)
    }catch(e){
        next(error)
    }
})
app.get('/api/appointments',async(req,res)=>{
    const appointment=await Appointment.find().populate('patient').populate('doctor').populate('testRecommendation').populate({
        path: 'prescription',
        populate: {
            path: 'medicinInstructions', 
        },
    })
    res.status(200).json(appointment)
})
app.delete('/api/appointments/:id',async(req,res)=>{
    const {id}=req.params
    const deletedAppointment=await Appointment.findByIdAndDelete(id)
    res.status(200).json({message:"Deleted Successfully!"})
    if(deletedAppointment){
        await MedicalRecord.create({
            medicalRecord:id
        })
    }
})
app.patch('/api/appointments/:id',async(req,res)=>{
    const {id}=req.params
    const {date,time,googleMeetLink,reqApplyedID,status}=req.body
    const updatedAppointment=await Appointment.findByIdAndUpdate(id,{
        $set: {
            date,
            time,
            googleMeetLink,
            status
        }
    },{new:true})
    await Doctor.findByIdAndUpdate(updatedAppointment.doctor,{
        $push:{appointments:updatedAppointment._id}
    })
    await ApplyForAppointment.findByIdAndDelete(reqApplyedID)
    await Doctor.findByIdAndUpdate(updatedAppointment.doctor,{
        $pull:{applyForAppointments:reqApplyedID}
    })
    res.status(200).json({message:'Updated Successfully',updatedAppointment})
})

app.get('/api/appointments/:id',async(req,res)=>{
    const {id}=req.params
    const appointment=await Appointment.findById(id).populate('patient').populate('doctor').populate('testRecommendation').populate({
        path: 'prescription',
        populate: {
            path: 'medicinInstructions', 
        },
    })
    res.status(200).json(appointment)
})


/**TestRecommendation */
app.post('/api/testRecommendations',async(req,res)=>{
    const {testName,image,apppintmentID}=req.body
    const testRecommendation=await TestRecommendation.create({
        testName,
        image
    })
    await Appointment.findByIdAndUpdate(
        apppintmentID,
        {$push:{testRecommendation:testRecommendation._id}},
        {new:true}
    )
    res.status(200).json(testRecommendation)
})

app.patch('/api/testRecommendations/:id',upload.single('image'),async(req,res)=>{
    const {id}=req.params
    const localFilePath=req.file.path //uploads\1734292049754-download.jpeg
    const cloudinaryResponse=await uploadOnCloudinary(localFilePath)
    const imageUrl=cloudinaryResponse.url 

    const updatedTest=await TestRecommendation.findByIdAndUpdate(id,{
        $set:{image:imageUrl}
    },{new:true})
    res.status(200).json({message:'Updated Successfully',updatedTest})
})

app.delete('/api/testRecommendations/:id',async(req,res)=>{
    const {id}=req.params
    const deletedTest=await TestRecommendation.findByIdAndDelete(id)
    res.status(200).json({message:'Deleted Successfully'})
})

/**Prescription */
app.post('/api/prescriptions',async(req,res)=>{
    const {date,diagnosis,instruction,appointmentID}=req.body
    const prescription=await Prescription.create({
        date:date || new Date(),
        diagnosis,
        instruction:instruction ||''
    })
    const appointment=await Appointment.findById(appointmentID)
    if(appointment.prescription) return res.status(400).json({message:'Already create an prescription'})
    await Appointment.findByIdAndUpdate(appointmentID,{
        $set:{prescription:prescription._id}
    })
    const updated= await Appointment.findByIdAndUpdate(appointmentID,{
        $set: {
            status:"completed"
        }
    },{new:true})
    console.log(updated)
    res.status(200).json(prescription)
})
app.patch('/api/prescriptions/:id',async(req,res)=>{
    const {id}=req.params
    const {date,diagnosis,instruction}=req.body
    const updatedPrescription=await Prescription.findByIdAndUpdate(id,{
        $set:{
            date,
            diagnosis,
            instruction
        }
    },{new:true})
    res.status(200).json({message:'Updated Successfully'})
})
app.delete('/api/prescriptions/:id',async(req,res)=>{
    const {id}=req.params
    const deletedPrescription=await Prescription.findByIdAndDelete(id)
    res.status(200).json({message:'Deleted Successfully'})
})

/**MedicinInstructions */
app.post('/api/medicinInstructions',async(req,res)=>{
    const {medicinName,dosage,frequency,duration,prescriptionID}=req.body
    const medicinInstruction=await MedicinInstruction.create({
        medicinName,
        dosage,
        frequency,
        duration
    })
    await Prescription.findByIdAndUpdate(prescriptionID,{
        $push:{medicinInstructions:medicinInstruction._id}
    })

    res.status(200).json(medicinInstruction)
})
app.patch('/api/medicinInstructions/:id',async(req,res)=>{
    const {id}=req.params
    const {medicinName,dosage,frequency,duration}=req.body
    const updatedMedicin=await MedicinInstruction.findByIdAndUpdate(id,{
        $set:{
            medicinName,
            dosage,
            frequency,
            duration
        }
    },{new:true})
    res.status(200).json({message:'Updated Successfully',updatedMedicin})
})
app.delete('/api/medicinInstructions/:id',async(req,res)=>{
    const {id}=req.params
    const deletedMedicin=await MedicinInstruction.findByIdAndDelete(id)
    res.status(200).json({message:'Deleted Successfully'})
})

/**Apply for Appointment */
app.post('/api/applyForAppointments',async(req,res)=>{
    const {date,patientName,doctorID,status,patientID}=req.body
    const appointment= await Appointment.create({
        patient:patientID,
        doctor:doctorID
    })
    const applyForAppointment=await ApplyForAppointment.create({
        date,
        patientName,
        doctorID,
        appointmentID:appointment._id,
        status
    })
    await Doctor.findByIdAndUpdate(doctorID,{
        $push:{applyForAppointments:applyForAppointment._id}
    },)


    await Patient.findByIdAndUpdate(patientID,{
        $push:{appointments:appointment._id}
    })
    res.status(200).json(applyForAppointment)
})
app.patch('/api/applyForAppointments/:id',async(req,res)=>{
    const {id}=req.params
    const {status}=req.body
    const updatedApply=await ApplyForAppointment.findByIdAndUpdate(id,{
        $set:{status}
    },{new:true})
    res.status(200).json({message:'Updated Successfully'})
})
app.delete('/api/applyForAppointments/:id',async(req,res)=>{
    const {id}=req.params
    const deletedApply=await ApplyForAppointment.findByIdAndDelete(id)
    console.log(deletedApply)
    console.log(deletedApply.appointmentID)
    await Appointment.findByIdAndUpdate(deletedApply.appointmentID,{
        $set:{
            status:'cancelled'
        }
    })

    await Doctor.findByIdAndUpdate(deletedApply.doctorID,{
        $push:{appointments:deletedApply.appointmentID}
    })

    await Doctor.findByIdAndUpdate(deletedApply.doctorID,{
        $pull:{applyForAppointments:deletedApply._id}
    })
    res.status(200).json({message:'Deleted Successfully'})
})

/**Medical Record */
app.post('/api/medicalRecord',async(req,res)=>{
    const {appointmentID}=req.body
    const medicalRecord=await MedicalRecord.create({
        medicalRecord:appointmentID
    })
    res.status(200).json(medicalRecord)
})
app.get('/api/medicalRecord',async(req,res)=>{
    const medicalRecord=await MedicalRecord.find().populate({
        path:'medicalRecord',
        populate:[
            {path:'patient'},
            {path:'doctor'},
            {path:'testRecommendation'},
            {path:'prescription',
                populate:'medicinInstructions'
            }
        ]
    })
    res.status(200).json(medicalRecord)
})
app.use((err,req,res,next)=>{
    const message=err.message?err.message:'Server Error Occurred';
    const status=err.status?err.status:500
    res.status(status).json({message})
})

/**SSL Commerz */

app.post('/api/initApplyForPayment', async(req, res) => {
    const {patientID,doctorID,scheduleID,slotID,timeValue,dateValue,age,dateOfBirth,fullName,gender,height,totalFee,weight}=req.body
    if(!patientID || !doctorID || !scheduleID || !slotID || !timeValue || !dateValue || !age || !dateOfBirth || !fullName || !gender || !height || !totalFee || !weight){
       return res.status(400).json({message:'Invalid Data! All Filled must be required.'})
    }
    const transactionId =uuidv4()
    const data = {
        total_amount: totalFee,
        currency: 'BDT',
        tran_id: transactionId, // use unique tran_id for each api call
        success_url: `${process.env.API_BASE_URL}/success`,
        fail_url: `${process.env.API_BASE_URL}/fail`,
        cancel_url: `${process.env.API_BASE_URL}/cancel`,
        ipn_url: `${process.env.API_BASE_URL}/ipn`,
        shipping_method: 'Courier',
        product_name: 'Computer.',
        product_category: 'Electronic',
        product_profile: 'general',
        cus_name: 'Customer Name',
        cus_email: 'customer@example.com',
        cus_add1: 'Dhaka',
        cus_add2: 'Dhaka',
        cus_city: 'Dhaka',
        cus_state: 'Dhaka',
        cus_postcode: '1000',
        cus_country: 'Bangladesh',
        cus_phone: '01711111111',
        cus_fax: '01711111111',
        ship_name: 'Customer Name',
        ship_add1: 'Dhaka',
        ship_add2: 'Dhaka',
        ship_city: 'Dhaka',
        ship_state: 'Dhaka',
        ship_postcode: 1000,
        ship_country: 'Bangladesh',
    };
    
    const sslcz = new SSLCommerzPayment(storeId,storePassword,is_live)
    sslcz.init(data).then(apiResponse => {
        let GatewayPageURL = apiResponse.GatewayPageURL
        console.log(GatewayPageURL)
        res.status(200).json(GatewayPageURL)
    });
    let applyAppointmentID=null;
    let appointmentID=null;
    const appointment= await Appointment.create({
        date:dateValue,
        time:timeValue,
        googleMeetLink:"",
        patientDetails:{
            fullName,
            dateOfBirth,
            age,
            gender,
            height,
            weight
        },
        patient:patientID,
        doctor:doctorID,
        transactionId:transactionId,
        totalFee:totalFee
    })

    appointmentID=appointment._id
    const applyForAppointment=await ApplyForAppointment.create({
        date:dateValue,
        time:timeValue,
        doctorID,
        appointmentID:appointmentID,
        patientDetails:{
            fullName,
            dateOfBirth,
            age,
            gender,
            height,
            weight
        },
        status:'Unpayed'
    })

    applyAppointmentID=applyForAppointment._id
    await Doctor.findByIdAndUpdate(doctorID,{
        $push:{applyForAppointments:applyAppointmentID}
    },)

    await Patient.findByIdAndUpdate(patientID,{
        $push:{appointments:appointmentID}
    })

    app.post('/success',async(req,res)=>{
        console.log("success")
        await ApplyForAppointment.findByIdAndUpdate(applyAppointmentID,{
            $set:{status:'Payed'}
        },{new:true})
       await Doctor.updateOne(
            { 
              _id: doctorID, 
              "schedule._id":scheduleID,
              "schedule.slots._id":slotID
            },
            {
              $set: {
                "schedule.$[schedule].slots.$[slot].status": "booked",
              }
            },
            {
                arrayFilters: [{ "slot._id": slotID},{"schedule._id":scheduleID}],
              }
          );
        res.redirect(`${process.env.FRONT_END_BASE_URL}/success/${transactionId}`)
    })
    app.post('/cancel',async(req,res)=>{
        await ApplyForAppointment.findByIdAndDelete(applyAppointmentID)
        await Doctor.findByIdAndUpdate(doctorID,{
            $pull:{applyForAppointments:applyAppointmentID}
        },)
        await Appointment.findByIdAndDelete(appointmentID)
        await Patient.findByIdAndUpdate(patientID,{
            $pull:{appointments:appointmentID}
        })
        res.redirect(`${process.env.FRONT_END_BASE_URL}/cancel`)
    })
    app.post('/fail',async(req,res)=>{
        await ApplyForAppointment.findByIdAndDelete(applyAppointmentID)
        await Doctor.findByIdAndUpdate(doctorID,{
            $pull:{applyForAppointments:applyAppointmentID}
        },)
        await Appointment.findByIdAndDelete(appointmentID)
        await Patient.findByIdAndUpdate(patientID,{
            $pull:{appointments:appointmentID}
        })
        res.redirect(`${process.env.FRONT_END_BASE_URL}/fail`)
    })
})

app.post('/api/freeAppointments',async(req,res,next)=>{
    const {patientID,doctorID,scheduleID,slotID,timeValue,dateValue,age,dateOfBirth,fullName,gender,height,totalFee,weight}=req.body
    console.log(req.body)
    if(!patientID || !doctorID || !scheduleID || !slotID || !timeValue || !dateValue || !age || !dateOfBirth || !fullName || !gender || !height || !weight){
       return res.status(400).json({message:'Invalid Data! All Filled must be required.'})
    }
    try{
        let applyAppointmentID=null;
        let appointmentID=null;
    const appointment= await Appointment.create({
        date:dateValue,
        time:timeValue,
        googleMeetLink:"",
        patientDetails:{
            fullName,
            dateOfBirth,
            age,
            gender,
            height,
            weight
        },
        patient:patientID,
        doctor:doctorID,
        totalFee:totalFee
    })

    appointmentID=appointment._id
    const applyForAppointment=await ApplyForAppointment.create({
        date:dateValue,
        time:timeValue,
        doctorID,
        appointmentID:appointmentID,
        patientDetails:{
            fullName,
            dateOfBirth,
            age,
            gender,
            height,
            weight
        },
        status:'Free'
    })

    applyAppointmentID=applyForAppointment._id
    await Doctor.findByIdAndUpdate(doctorID,{
        $push:{applyForAppointments:applyAppointmentID}
    },)

    await Patient.findByIdAndUpdate(patientID,{
        $push:{appointments:appointmentID}
    })
    await Doctor.updateOne(
        { 
          _id: doctorID, 
          "schedule._id":scheduleID,
          "schedule.slots._id":slotID
        },
        {
          $set: {
            "schedule.$[schedule].slots.$[slot].status": "booked",
          }
        },
        {
            arrayFilters: [{ "slot._id": slotID},{"schedule._id":scheduleID}],
          }
      );
    res.status(200).json({message:"successfully applied for free appointment",freeAppointmentId:appointmentID})

    }catch(e){
        next(e)
    }
})


/**PromoCode */

app.post('/api/promoCode',async(req,res,next)=>{
    console.log(req.body)
    const {code,percentage,expiryDate,usageLimit}=req.body;
    console.log(code)
    const promoCode=await PromoCode.findOne({code})
    if(promoCode){
        return res.status(400).json({message:"Already use this promoCode"})
    }

    const newPromoCode=await PromoCode.create({
        code,
        percentage,
        expiryDate,
        usageLimit
    })

    return res.status(200).json({message:"promoCode created successfully",newPromoCode})
})

app.post('/api/promoCodeValidate',async(req,res,next)=>{
    const {code}=req.body
    const promoCode=await PromoCode.findOne({code})

    if(!promoCode){
        return res.status(400).json({valid:false,message:"Invalid promo code"})
    }

    const now=new Date()
    if(now>promoCode.expiryDate){
        return res.status(400).json({valid:false,message:"Promo Code expired"})
    }

    if(promoCode.users.length >promoCode.usageLimit){
        return res.status(400).json({valid:false,message:"Promo code user is over"})
    }
    res.status(200).json({valid:true,percentage:promoCode.percentage})
})

app.get('/api/promoCodes',async(req,res,next)=>{
    try{
        const promoCodes=await PromoCode.find()
        res.status(200).json(promoCodes)
    }catch(e){
        next(e)
    }
})
app.delete('/api/promoCodes/:id',async(req,res,next)=>{
    const{id}=req.params
    try{
        const deletedPromo=await PromoCode.findByIdAndDelete(id)
        if(!deletedPromo){
            res.status(400).json({message:"Promo Code not found"})
        }
        res.status(200).json({message:"Deleted Successfully"})
    }catch(e){
        next(e)
    }
})
app.patch('/api/promoCodes/:id',async(req,res,next)=>{
    const {id}=req.params;
    console.log(id)
    console.log(req.body)
    try{
        const updatedData=await PromoCode.findByIdAndUpdate(id,{
            $set:{
                ...req.body
            }
        },{new:true})
        if(!updatedData){
            return res.status(400).json({message:"Promo Code Not Found?"})
        }
        res.status(200).json({message:"updated successfully"})

    }catch(e){
        next(e)
    }
})

removeUnverifiedAccounts()
connectDB(databaseUrl)
.then(()=>{
    app.listen(port,()=>{
        console.log('server is running!')
    })
    console.log('database is connected')
})
// mongodb+srv://hossantopu:<db_password>@digitalhospital.iatbk.mongodb.net/
// hdp5nONqO369IUbK
// twilo_recovery= 1UNTPJD2ADTSK32MAZ8DZ5Z7