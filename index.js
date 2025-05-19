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
app.use(cors()) //TODO
app.use(express.json())
const crypto = require("crypto");
const removeUnverifiedAccounts = require('./automation/removeUnverifiedAccount')
const Blog = require('./models/Blog')
const HealthHub = require('./models/HealthHub')
const authorize = require('./middlewares/authorize')
const client = require('twilio')(process.env.TWILIO_SID, process.env.TWILIO_AUTH_TOKEN);

const port=process.env.PORT || 5000
const storeId = process.env.STORE_ID;
const storePassword = process.env.STORE_PASSWORD;
const databaseUrl=process.env.DATABASE_URL

/**Health Check */
app.get('/health',(req,res)=>{
    res.send('Health is Good!')
})

/**Authentication */
app.post('/api/register',upload.fields([{ name: "profile" }, { name: "signature" }]),async (req, res, next) => {
        console.log(req.body)
    try {
      const { username, credential, password, role = "patient" } = req.body;
      if (!username || !credential || !password) {
        return next(error("All fields are required", 400));
      }

      if (role === "healthHub") {

          const existingPharmacyReg = await HealthHub.findOne({ phanmacyReg: req.body.phanmacyReg });
          if (existingPharmacyReg) {
            return res.status(400).json({ field:'pharmacyReg',message: "Pharmacy Registration already exists" });
          }

        const existingNid = await HealthHub.findOne({ nid: req.body.nid });
        if (existingNid) {
          return res.status(400).json({ field:'nid',message: "NID already exists" });
        }

      }

      const existingUser = await User.findOne({ credential, accountVerified: true });
      if (existingUser) {
        return res.status(400).json({ field: "credential", message: "Email already in use!" });
      }

      const unverifiedAttempts = await User.find({ credential, accountVerified: false });
      if (unverifiedAttempts.length > 3) {
        return res.status(400).json({ message: "Too many attempts. Try again after 1 hour." });
      }

      const user = await User.create({
        username,
        credential,
        password,
        role,
      });

      const verificationCode = await user.generateVerificationCode();
      await user.save();
      res.status(200).json({ success: true, message: "Registration received. Please check your email for verification CODE." });
      setImmediate(async () => {
        // Send email or SMS
        await sendVerificationCode(verificationCode, username, credential, res);
        
        await handleRoleSpecificTasks(user, req);
        // Upload to Cloudinary
        });

      async function handleRoleSpecificTasks(user, req) {

        if(!user) return null
        const { role } = user;


        if (role === "patient") {
            return await Patient.create({ _id: user._id, image: '' });
        }

        if (role === "doctor") {
            const profilePath = req?.files?.profile?.[0]?.path;
            const signaturePath = req?.files?.signature?.[0]?.path;
            console.log(profilePath)
            console.log(signaturePath)
            let profileUrl = '';
            let signatureUrl = '';

            if (profilePath || signaturePath) {
            const [profileUpload, signatureUpload] = await Promise.all([
                profilePath ? uploadOnCloudinary(profilePath) : Promise.resolve({ url: '' }),
                signaturePath ? uploadOnCloudinary(signaturePath) : Promise.resolve({ url: '' }),
            ]);

            profileUrl = profileUpload?.url || '';
            signatureUrl = signatureUpload?.url || '';
            }

            const scheduleData = JSON.parse(req.body.schedule || "[]");
            return await Doctor.create({
            _id: user._id,
            firstName: req.body.firstName,
            lastName: req.body.lastName,
            dateOfBirth: req.body.dateOfBirth,
            mobile: req.body.mobile,
            nidOrPassport: req.body.nidOrPassport,
            nationality: req.body.nationality,
            gender: req.body.gender,
            fee: req.body.fee,
            organization: req.body.organization,
            biography: req.body.biography,
            title: req.body.title,
            bmdcNumber: req.body.bmdcNumber,
            bmdcExpiryDate: req.body.bmdcExpiryDate,
            degrees: req.body.degrees,
            speciality: req.body.speciality,
            yearOfExperience: req.body.yearOfExperience,
            profile: profileUrl,
            designation: req.body.designation,
            signature: signatureUrl,
            schedule: scheduleData
            });
        }

        if (role === "healthHub") {
            const generateCode = Math.random().toString(36).substring(2, 10).toUpperCase();
            const profilePath = req?.files?.profile?.[0]?.path;
            const signaturePath = req?.files?.signature?.[0]?.path;
       
            let profileUrl = '';
            let signatureUrl = '';

            if (profilePath || signaturePath) {
            const [profileUpload, signatureUpload] = await Promise.all([
                profilePath ? uploadOnCloudinary(profilePath) : Promise.resolve({ url: '' }),
                signaturePath ? uploadOnCloudinary(signaturePath) : Promise.resolve({ url: '' }),
            ]);

            profileUrl = profileUpload?.url || '';
            signatureUrl = signatureUpload?.url || '';
            }


            await HealthHub.create({
            _id: user._id,
            profile: profileUrl,
            nid: req.body.nid || '',
            pharmacyName: req.body.pharmacyName || '',
            phanmacyReg: req.body.phanmacyReg || '',
            country: req.body.country || '',
            division: req.body.division || '',
            district: req.body.district || '',
            upazila: req.body.upazila || '',
            category: req.body.category || '',
            description: req.body.description || '',
            facilities: req.body.facilities || '',
            pharmacyImage: signatureUrl,
            payment: {
                service: req.body.service || '',
                number: req.body.number || ''
            },
            phone: req.body.phone || '',
            status: req.body.status || 'pending'
            });

            const existingPromocode=await PromoCode.findOne({code:req.body.phanmacyReg})

            // await PromoCode.create({
            // creatorId: user._id,
            // code: existingPromocode? generateCode : req.body.phanmacyReg,
            // percentage: 10
            // });

            await PromoCode.updateOne(
            { code: req.body.phanmacyReg },
            { $setOnInsert: { creatorId: user._id, percentage: 10 } },
            { upsert: true }
            );
        }
        }

        async function sendVerificationCode(code, username, credential, res) {
        const method = isEmailOrPhone(credential);

        if (method === "email") {
            const message = generateEmailTemplate(code);
            try {
            await sendEmail({ credential, subject: "Your Verification Code From Sureline", message });
            } catch (error) {
                console.log(error)
            }
        }

        if (method === "phone") {
            try {
            const formattedPhone = "+88" + credential;
            const spacedCode = code.toString().split("").join(" ");
            await client.messages.create({
                body: `Your OTP is ${spacedCode}`,
                from: process.env.TWILIO_PHONE_NUMBER,
                to: formattedPhone
            });
            // return res.status(200).json({ success: true, message: "OTP sent to phone." });
            } catch (error) {
                console.log(error)
            // throw error
            }
        }

        // return res.status(400).json({ success: false, message: "Invalid verification method." });
        }

        function generateEmailTemplate(code) {
        return `
            <div style="font-family: Arial; max-width: 600px; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
            <h2 style="color: #4CAF50;">Verification Code</h2>
            <p>Your code is:</p>
            <h3 style="background: #e8f5e9; color: #4CAF50; padding: 10px; border-radius: 5px; display: inline-block;">
                ${code}
            </h3>
            <p>Please use this within 10 minutes.</p>
            </div>
        `;
        }

    } catch (err) {
      next(err);
    }
  }
 


);

app.post('/api/otp-verification',async(req,res,next)=>{
    const {credential,otp}=req.body
    if(!credential){
        return next(error("Invalid Credential",400))
    }
    const checkCredential=isEmailOrPhone(credential)
    if(checkCredential=="invalid"){
        return next(error("Invalid Credential",400))
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
    const resetPasswordUrl=`${process.env.FRONT_END_BASE_URL}/password/reset/${resetToken}`;
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


/**Forced Password */
app.patch('/api/users/:id/forceResetPassword',isAuthenticated,authorize(['admin']),async (req, res) => {

    const {id}=req.params
    const {tempPassword } = req.body

  try {
    const user = await User.findById(id);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.password = tempPassword; // Will be hashed via pre-save hook
    user.forcePasswordReset = true;
    await user.save();
    console.log(user)

    res.json({success:true, message: "Temporary password set. User will be prompted to reset on login." });
  } catch (err) {
    res.status(500).json({ message: "Something went wrong" });
  }
})


/**completeForcedReset */
app.patch('/api/users/completeForcedReset',isAuthenticated,authorize(['patient']),async (req, res) => {

  const {newPassword,credential} = req.body;
  
  try {
    const user = await User.findOne({credential});
    console.log(user)
    if (!user) return res.status(404).json({ message: "User not found" });

    user.password = newPassword;
    user.forcePasswordReset = false; // ✅ Disable forced reset
    await user.save();

    res.json({success:true,user,message: "Password updated successfully." });
  } catch (err) {
    res.status(500).json({ message: "Failed to update password." });
  }
})



/**User */
app.get('/api/users',isAuthenticated,authorize(['admin']),async(req,res,next)=>{
    const users=await User.find({
        accountVerified:true
    }).select('-password -resetPasswordToken -resetPasswordExpire -verificationCode -verificationCodeExpire')

    const allUsers = await users.reduce(async (accPromise, cur) => {
        const acc = await accPromise;
        if(cur.role==='patient' || cur.role==='admin'){
            acc.push(cur)
        }
        if(cur.role==='healthHub'){
            acc.push(cur)
        }
        if (cur.role === 'doctor') {
            const findDoctor = await Doctor.findById(cur._id); // ✅ No ObjectId needed
            if (findDoctor?.isValid) {
                acc.push(cur);
            }
        }
        return acc;
    }, Promise.resolve([]));
    res.status(200).json(allUsers)
})

app.delete('/api/users/:id',isAuthenticated,authorize(['admin']),async(req,res)=>{
    const {id}=req.params
    const user=await User.findById(id)
    user?.role==='patient' && await Patient.findByIdAndDelete(id)
    user?.role==='doctor' && await Doctor.findByIdAndDelete(id)

    if(user?.role==='healthHub'){
        await HealthHub.findByIdAndDelete(id)
        await PromoCode.deleteOne({ creatorId:id });
    }

    await User.findByIdAndDelete(id)
    
    res.status(200).json({message:'User Deleted Successfully'})
})


/**Patient*/
app.get('/api/patient/:id',isAuthenticated,authorize(['patient']),async(req,res)=>{
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

app.patch('/api/patient/:id',isAuthenticated,authorize(['patient']),async(req,res,error)=>{
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

app.delete('/api/patients/:id',isAuthenticated,authorize(['patient']),async(req,res)=>{
    const {id}=req.params
    const deletedPatient=await Patient.findByIdAndDelete(id)
    res.status(200).json({message:'Deleted Successfully'})
})

app.patch('/api/patientAppointment/:id',isAuthenticated,authorize(['patient']),async(req,res)=>{
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

app.patch('/api/patientImage/:id',isAuthenticated,authorize(['patient']),upload.single('image'),async(req,res)=>{
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
        const doctors=await Doctor.find({isValid:true}).populate('applyForAppointments').populate({
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

app.get('/api/doctors/requested',isAuthenticated,authorize(['admin']),async(req,res,next)=>{
        
        try{
            const verifiedUserIds = await User.find({ accountVerified: true }, '_id');

            const doctors = await Doctor.find({
            isValid: false,
            _id: { $in: verifiedUserIds.map(user => user._id) }
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
            {path: 'testRecommendation'},
            {path:'patient'},
            {path:'doctor'},
            {path:'prescription',
                populate:'medicinInstructions'
            }
        ]
    })
    res.status(200).json(doctor)
})

app.patch('/api/doctors/:id',isAuthenticated,authorize(['doctor','admin']),async(req,res)=>{
    const {id}=req.params
    const updatedFormData=req.body
    const updatedDoctor=await Doctor.findByIdAndUpdate(id,
        {$set: updatedFormData },
        {new:true}
    )
    res.status(200).json(updatedDoctor)
})

app.patch('/api/doctorSchedule/:doctorID',isAuthenticated,authorize(['doctor']),async(req,res)=>{
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

app.delete('/api/doctors/:id',isAuthenticated,authorize(['doctor']),async(req,res)=>{
    const {id}=req.params
    const deletedDoctor=await Doctor.findByIdAndDelete(id)
    res.status(200).json({message:'Deleted Successfully'})
})

app.patch('/api/doctorAppointment/:id',isAuthenticated,authorize(['doctor','patient']),async(req,res)=>{
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

app.patch('/api/doctorImage/:id',isAuthenticated,authorize(['doctor']),upload.single('image'),async(req,res)=>{
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

app.patch('/api/doctorScheduleSlotStatus',isAuthenticated,authorize(['doctor']),async(req,res)=>{
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

app.patch('/api/doctorScheduleStatus',isAuthenticated,authorize(['doctor']),async(req,res)=>{
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
app.patch('/api/doctors/:doctorID/schedule/:scheduleID',isAuthenticated,authorize(['doctor']),async(req,res)=>{
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
app.delete("/api/doctors/:doctorID/schedule/:scheduleID/slot/:slotID",isAuthenticated,authorize(['doctor']),async (req, res) => {
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
app.post('/api/appointment',isAuthenticated,authorize(['patient','healthHub']),async(req,res)=>{
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

app.get('/api/appointments',isAuthenticated,authorize(['doctor','healthHub','admin','patient']),async(req,res)=>{
    const appointment=await Appointment.find().sort('-createdAt').populate('patient').populate('doctor').populate('testRecommendation').populate({
        path: 'prescription',
        populate: {
            path: 'medicinInstructions', 
        },
    })
    res.status(200).json(appointment)
})

app.delete('/api/appointments/:id',isAuthenticated,authorize(['admin']),async(req,res)=>{
    const {id}=req.params
    const deletedAppointment=await Appointment.findByIdAndDelete(id)
    res.status(200).json({message:"Deleted Successfully!"})
    if(deletedAppointment){
        await MedicalRecord.create({
            medicalRecord:id
        })
    }
})

app.patch('/api/appointments/:id',isAuthenticated,authorize(['doctor']),async(req,res)=>{
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

app.get('/api/appointments/:id',isAuthenticated,authorize(['patient','healthHub','doctor']),async(req,res)=>{
    const {id}=req.params
    const appointment=await Appointment.findById(id).populate('patient').populate('doctor').populate('testRecommendation').populate({
        path: 'prescription',
        populate: {
            path: 'medicinInstructions', 
        },
    })
    res.status(200).json(appointment)
})

app.patch('/api/appointments/status/:id',isAuthenticated,authorize(['doctor']),async(req,res)=>{
    
    const {id}=req.params
     await Appointment.findByIdAndUpdate(id,{
        $set: {
            status:"completed"
        }
    },{new:true})
    res.status(200).json({success:true,message:"updated status"})
})

app.patch('/api/appointments/referredPayment/:id',isAuthenticated,authorize(['admin']),async(req,res)=>{
    const {id}=req.params
    const {referredPayment}=req.body
     await Appointment.findByIdAndUpdate(id,{
        $set: {
            referredPayment
        }
    },{new:true})
    res.status(200).json({success:true,message:"updated referredPayment"})
})


/**TestRecommendation */
app.post('/api/testRecommendations',isAuthenticated,authorize(['doctor']),async(req,res)=>{
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

app.patch('/api/testRecommendations/:id',isAuthenticated,authorize(['patient','healthHub']),upload.single('image'),async(req,res)=>{
    const {id}=req.params
    const localFilePath=req.file.path //uploads\1734292049754-download.jpeg
    const cloudinaryResponse=await uploadOnCloudinary(localFilePath)
    const imageUrl=cloudinaryResponse.url 

    const updatedTest=await TestRecommendation.findByIdAndUpdate(id,{
        $set:{image:imageUrl}
    },{new:true})
    res.status(200).json({message:'Updated Successfully',updatedTest})
})

app.delete('/api/testRecommendations/:id',isAuthenticated,authorize(['doctor']),async(req,res)=>{
    const {id}=req.params
    const deletedTest=await TestRecommendation.findByIdAndDelete(id)
    res.status(200).json({message:'Deleted Successfully'})
})



/**Prescription */
app.post('/api/prescriptions',isAuthenticated,authorize(['doctor']),async(req,res)=>{
    const {problem,appointmentID}=req.body
    const prescription=await Prescription.create({
        problem
    })
    const appointment=await Appointment.findById(appointmentID)
    if(appointment.prescription) return res.status(400).json({message:'Already create an prescription'})
    await Appointment.findByIdAndUpdate(appointmentID,{
        $set:{prescription:prescription._id}
    })
    // const updated= await Appointment.findByIdAndUpdate(appointmentID,{
    //     $set: {
    //         status:"completed"
    //     }
    // },{new:true})
    res.status(200).json(prescription)
})

app.patch('/api/prescriptions/:id',isAuthenticated,authorize(['doctor']),async(req,res)=>{
    const {id}=req.params
    console.log(id)
    const {updatedData}=req.body
    console.log(updatedData)
    try{
        await Prescription.findByIdAndUpdate(id,{
            $set:{
                ...updatedData
            }
        },{new:true})
        res.status(200).json({message:'Updated Successfully'})
    }catch(e){
        console.log(e)
    }
})

app.delete('/api/prescriptions/:id',isAuthenticated,authorize(['doctor']),async(req,res)=>{
    const {id}=req.params
    await Prescription.findByIdAndDelete(id)
    res.status(200).json({message:'Deleted Successfully'})
})

app.get('/api/prescriptions/:id',isAuthenticated,authorize(['doctor','patient','healthHub']),async(req,res)=>{
    const {id}=req.params
    const prescription=await Prescription.findById(id).populate("medicinInstructions")
    res.status(200).json(prescription)
})



/**MedicinInstructions */
app.post('/api/medicinInstructions',isAuthenticated,authorize(['doctor']),async(req,res)=>{
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

app.patch('/api/medicinInstructions/:id',isAuthenticated,authorize(['doctor']),async(req,res)=>{
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

app.delete('/api/medicinInstructions/:id',isAuthenticated,authorize(['doctor']),async(req,res)=>{
    const {id}=req.params
    const deletedMedicin=await MedicinInstruction.findByIdAndDelete(id)
    res.status(200).json({message:'Deleted Successfully'})
})


/**Apply for Appointment */
app.post('/api/applyForAppointments',isAuthenticated,authorize(['patient','healthHub']),async(req,res)=>{
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

app.patch('/api/applyForAppointments/:id',isAuthenticated,authorize(['doctor']),async(req,res)=>{
    const {id}=req.params
    const {status}=req.body
    const updatedApply=await ApplyForAppointment.findByIdAndUpdate(id,{
        $set:{status}
    },{new:true})
    res.status(200).json({message:'Updated Successfully'})
})

app.delete('/api/applyForAppointments/:id',isAuthenticated,authorize(['doctor']),async(req,res)=>{
    const {id}=req.params
    const deletedApply=await ApplyForAppointment.findByIdAndDelete(id)

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


/**SSL Commerz */
app.post('/api/initApplyForPayment',isAuthenticated,authorize(['patient','healthHub']),async(req, res) => {
    
    const {patientID='',doctorID,scheduleID,slotID,timeValue,dateValue,age,dateOfBirth,fullName,gender,height,totalFee,weight,referenceHealhtHubID=''}=req.body
    console.log(req.body)

    if(!doctorID || !scheduleID || !slotID || !timeValue || !dateValue || !age || !dateOfBirth || !fullName || !gender || !height || !totalFee || !weight){
       return res.status(400).json({message:'Invalid Data! All Filled must be required.'})
    }

    let applyAppointmentID=null;
    let appointmentID=null;
    const transactionId =uuidv4()

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
        patient:patientID ?? undefined,
        doctor:doctorID,
        transactionId:transactionId,
        totalFee:totalFee,
        referenceHealhtHubID:referenceHealhtHubID??undefined
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
    
    const data = {
        total_amount: totalFee,
        currency: 'BDT',
        tran_id: transactionId, // use unique tran_id for each api call
        success_url: `${process.env.API_BASE_URL}/payment/success?applyAppointmentID=${applyAppointmentID}&doctorID=${doctorID}&scheduleID=${scheduleID}&slotID=${slotID}&transactionId=${transactionId}`,
        fail_url: `${process.env.API_BASE_URL}/payment/fail?applyAppointmentID=${applyAppointmentID}&doctorID=${doctorID}&patientID=${patientID}&appointmentID=${appointmentID}&referenceHealhtHubID=${referenceHealhtHubID}`,
        cancel_url: `${process.env.API_BASE_URL}/payment/cancel?applyAppointmentID=${applyAppointmentID}&doctorID=${doctorID}&patientID=${patientID}&appointmentID=${appointmentID}&referenceHealhtHubID=${referenceHealhtHubID}`,
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
        emi_option: 0,
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
        res.status(200).json(GatewayPageURL)
    });
    
    await Doctor.findByIdAndUpdate(doctorID,{
        $push:{applyForAppointments:applyAppointmentID}
    },)

    if(patientID){
        await Patient.findByIdAndUpdate(patientID,{
            $push:{appointments:appointmentID}
        })
    }
    if(referenceHealhtHubID && req?.user?.role=='healthHub'){
        await HealthHub.findByIdAndUpdate(referenceHealhtHubID,{
            $push:{appointments:appointmentID}
        })
    }


})

app.post('/payment/success',async(req,res)=>{
    const { applyAppointmentID, doctorID, scheduleID, slotID, transactionId } = req.query;
    
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

app.post('/payment/cancel',async(req,res)=>{
    const {patientID,doctorID,appointmentID,applyAppointmentID,referenceHealhtHubID}=req.query

    await ApplyForAppointment.findByIdAndDelete(applyAppointmentID)

    await Doctor.findByIdAndUpdate(doctorID,{
        $pull:{applyForAppointments:applyAppointmentID}
    },)

    await Appointment.findByIdAndDelete(appointmentID)

    if(patientID){
        await Patient.findByIdAndUpdate(patientID,{
            $pull:{appointments:appointmentID}
        })
    }

    if(referenceHealhtHubID){
        await HealthHub.findByIdAndDelete(referenceHealhtHubID,{
            $pull:{appointments:appointmentID}
        })
    }
    res.redirect(`${process.env.FRONT_END_BASE_URL}/cancel`)
})

app.post('/payment/fail',async(req,res)=>{
     const {patientID,doctorID,appointmentID,applyAppointmentID,referenceHealhtHubID}=req.query

    await ApplyForAppointment.findByIdAndDelete(applyAppointmentID)

    await Doctor.findByIdAndUpdate(doctorID,{
        $pull:{applyForAppointments:applyAppointmentID}
    },)

    await Appointment.findByIdAndDelete(appointmentID)

    if(patientID){
        await Patient.findByIdAndUpdate(patientID,{
            $pull:{appointments:appointmentID}
        })
    }

    if(referenceHealhtHubID){
        await HealthHub.findByIdAndDelete(referenceHealhtHubID,{
            $pull:{appointments:appointmentID}
        })
    }
    res.redirect(`${process.env.FRONT_END_BASE_URL}/fail`)
})

app.post('/api/freeAppointments',isAuthenticated,authorize(['patient','healthHub']),async(req,res,next)=>{

    const {patientID='',doctorID,scheduleID,slotID,timeValue,dateValue,age,dateOfBirth,fullName,gender,height,totalFee,weight,referenceHealhtHubID=''}=req.body

    if(!doctorID || !scheduleID || !slotID || !timeValue || !dateValue || !age || !dateOfBirth || !fullName || !gender || !height || !weight){

       return res.status(400).json({message:'Invalid Data! All Filled must be required.'})
    }

    try{
        let applyAppointmentID=null;
        let appointmentID=null;
        const transactionId =uuidv4()

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
            patient:patientID ??undefined,
            doctor:doctorID,
            transactionId:transactionId,
            totalFee:totalFee,
            referenceHealhtHubID:referenceHealhtHubID??undefined
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
            status:'free'
        })
        applyAppointmentID=applyForAppointment._id

    
   await Doctor.findByIdAndUpdate(doctorID,{
        $push:{applyForAppointments:applyAppointmentID}
    },)

    if(patientID){
        await Patient.findByIdAndUpdate(patientID,{
            $push:{appointments:appointmentID}
        })
    }
    if(referenceHealhtHubID && req?.user?.role=='healthHub'){
        await HealthHub.findByIdAndUpdate(referenceHealhtHubID,{
            $push:{appointments:appointmentID}
        })
    }

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
app.post('/api/promoCode',isAuthenticated,authorize(['admin']),async(req,res,next)=>{
    const {creatorId,code,percentage,expiryDate,usageLimit}=req.body;
    try{
        const promoCode=await PromoCode.findOne({code})
    if(promoCode){
        return res.status(400).json({message:"Already use this promoCode"})
    }

    const newPromoCode=await PromoCode.create({
        creatorId,
        code,
        percentage
    })

    return res.status(200).json({message:"promoCode created successfully",newPromoCode})
    }catch(e){
        next(e)
    }
})

app.post('/api/promoCodeValidate',isAuthenticated,authorize(['patient','healthHub']),async(req,res,next)=>{
    const {code,userId}=req.body
    const user=await User.findById({_id:userId})
    const promoCode=await PromoCode.findOne({code}).populate('creatorId')
    if(!promoCode){
        return res.status(400).json({valid:false,message:"Invalid promo code"})
    }

    if(user?.role==='patient'){
        console.log(promoCode)
        const response={
            valid:'patient',
            percent:promoCode.percentage,
            author:promoCode?.creatorId
        }
        res.status(200).json(response)
    }
    if(user?.role==='healthHub'){
        res.status(200).json({valid:'notValid',percent:0,author:promoCode?.creatorId})
    }

    
    // const now=new Date()
    // if(now>promoCode.expiryDate){
    //     return res.status(400).json({valid:false,message:"Promo Code expired"})
    // }

    // if(promoCode.users.length >promoCode.usageLimit){
    //     return res.status(400).json({valid:false,message:"Promo code user is over"})
    // }
})

app.get('/api/promoCodes/:userId',isAuthenticated,authorize(['patient','healthHub']),async(req,res,next)=>{
    const {userId}=req.params
    try{
        const promoCode=await PromoCode.findOne({creatorId:userId})
        if(!promoCode){
            res.status(400).json({message:'promoCode not found'})
        }
        res.status(200).json(promoCode)
    }catch(e){
        res.status(400).json({error:e.message})
    }
})

app.get('/api/promoCodes',isAuthenticated,authorize(['admin']),async(req,res,next)=>{
    try{
        const promoCodes=await PromoCode.find().populate('creatorId')

        if(promoCodes.length===0) return null

    // Step 2: Filter only creatorIds that are healthHub role
    const healthHubCreators = promoCodes.filter(
      promo => promo.creatorId?.role === 'healthHub'
    ).map(promo => promo.creatorId._id);

    // Step 3: Get healthHub data for those users
    const healthHubs = await HealthHub.find({ _id: { $in: healthHubCreators } });

    // Step 4: Create a map for quick access
    const healthHubMap = new Map(healthHubs.map(h => [h._id.toString(), h]));

    // Step 5: Merge healthHub info into each promoCode (if applicable)
    const payload = promoCodes.map(promo => {
      const creatorIdStr = promo.creatorId?._id?.toString();
      const healthHub = promo.creatorId?.role === 'healthHub' ? healthHubMap.get(creatorIdStr) : null;

      return {
        _id:promo?._id,
        code:promo?.code,
        percentage:promo?.percentage,
        author:{
            username:promo?.creatorId?.username,
            role:promo?.creatorId?.role
        },
        healthHub: healthHub ? {
          pharmacyName: healthHub.pharmacyName,
          
        } : null
      };
    });
 
        res.status(200).json(payload)
    }catch(e){
        next(e)
    }
})

app.delete('/api/promoCodes/:id',isAuthenticated,authorize(['admin']),async(req,res,next)=>{
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

app.patch('/api/promoCodes/:id',isAuthenticated,authorize(['admin','healthHub']),async(req,res,next)=>{
    const {id}=req.params;
    const exitPromocode=await PromoCode.findById(id)
    if(!exitPromocode){
        res.status(404).json({message:'Not Found Any Promocode!'})
    }
    const promoCode=await PromoCode.findOne({code:req.body?.code})
    if(promoCode){
        res.status(400).json({message:'This code is already used!'})
    }
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


/**Blog */
app.post('/api/blogs',isAuthenticated,authorize(['admin']),upload.single('image'),async(req,res)=>{
    const localFilePath=req.file?.path
    const cloudinaryResponse=await uploadOnCloudinary(localFilePath)
    const imageUrl=cloudinaryResponse.url
    const payload={
        ...req.body,
        image:imageUrl
    }
    
    try{
        const blog=new Blog(payload)
        await blog.save()
        res.status(201).json({message:'created successfully'})
    }catch(e){
        res.status(400).json({error:e.message})
    }
})

app.get('/api/blogs',async(req,res,next)=>{
    try {
        const blogs = await Blog.find().sort({ createdAt: -1 });
        res.status(200).json(blogs);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
})

app.get('/api/blogs/:id',async(req,res,next)=>{
    const {id}=req.params
    try {
        const blog = await Blog.findById(id);
        if (!blog) return res.status(404).json({ message: 'Blog not found' });
        res.status(200).json(blog);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
})

app.patch('/api/blogs/:id',isAuthenticated,authorize(['admin']),upload.single('image'),async(req,res)=>{
    const {id}=req.params
    const blog=await Blog.findById(id)
    if(!blog){
        res.status(400).json({message:'blog not found'})
    }
    const localFilePath=req.file?.path
    const cloudinaryResponse=await uploadOnCloudinary(localFilePath)
    const imageUrl=cloudinaryResponse?.url
    const payload={
        ...req.body,
        image:imageUrl
    }
    Object.keys(payload).forEach((key)=>{
        blog[key]=payload[key] ?? blog[key]
    })

    await blog.save()
    res.status(200).json({message:'updated successfully'})
})

app.delete('/api/blogs/:id',isAuthenticated,authorize(['admin']),async(req,res,next)=>{
    const {id}=req.params
    try {
        const deletedBlog = await Blog.findByIdAndDelete(id);
        if (!deletedBlog) return res.status(404).json({ message: 'Blog not found' });
        res.status(200).json({ message: 'Blog deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
})


/**Health Hub */
app.get('/api/healthHub',async(req,res,next)=>{
    try {
        const healthHub = await HealthHub.find().sort({ createdAt: -1 });
        
        res.status(200).json(healthHub);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
})

app.get('/api/healthHub/:id',isAuthenticated,authorize(['healthHub']),async(req,res,next)=>{
    const {id}=req.params
    try {
        const healthHub = await HealthHub.findById(id).populate({
            path: 'appointments',
            populate: [
                {path: 'testRecommendation'},
                {path:'patient'},
                {path:'doctor'},
                {path:'prescription',
                    populate:'medicinInstructions'
                }
            ]
        });
        if (!healthHub) return res.status(404).json({ message: 'Health hub not found' });
        res.status(200).json(healthHub);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
})

app.patch('/api/healthHub/:id',isAuthenticated,authorize(['healthHub']),upload.fields([{ name: "profile" }, { name: "signature" }]),async(req,res)=>{
    
    const {
        nid,
        pharmacyName,
        phanmacyReg,
        country,
        division,
        district,
        upazila,
        category,
        description,
        pharmacyImage,
        phone,
        facilities,
        status,
        service,
        number
    }=req.body
    
    const {id}=req.params
    const healthHub=await HealthHub.findById(id)
    if(!healthHub){
        res.status(400).json({message:'HealthHub not found'})
    }

    const existingNid=await HealthHub.findOne({nid: req.body.nid})
    if(existingNid){
        return res.status(400).json({ error: "NID already exists" });
    }

    const existingphanmacyReg=await HealthHub.findOne({phanmacyReg: req.body.phanmacyReg})
    if(existingphanmacyReg){
        return res.status(400).json({ error: "phanmacyReg already exists" });
    }
    
    const profileLocalFilePath=req?.files?.profile&&req?.files?.profile[0].path;
    const signatureLocalFilePath=req?.files?.signature&&req.files.signature[0].path;
            
    const cloudinaryResponseProfile=await uploadOnCloudinary(profileLocalFilePath)
    const profileUrl=cloudinaryResponseProfile?.url

    const cloudinaryResponseSignature=await uploadOnCloudinary(signatureLocalFilePath)
    const signatureUrl=cloudinaryResponseSignature?.url
    const payload={
        nid:nid || null,
        pharmacyName:pharmacyName || null,
        phanmacyReg:phanmacyReg || null,
        country:country || null,
        division:division || null,
        district:district || null,
        upazila:upazila || null,
        category:category || null,
        description:description || null,
        pharmacyImage:pharmacyImage || null,
        phone:phone || null,
        status:status || null,
        facilities:facilities || null,
        profile:profileUrl || null,
        pharmacyImage:signatureUrl || null
    }

    Object.keys(payload).forEach((key)=>{
        healthHub[key]=payload[key] ?? healthHub[key]
    })
    healthHub.payment.service=service || healthHub.payment.service
    healthHub.payment.number=number || healthHub.payment.number
    await healthHub.save()
    res.status(200).json({message:'updated successfully'})
})

app.get('/api/healthHub/:id/refAppointments',isAuthenticated,authorize(['healthHub']),async (req, res, next) => {
    const { id } = req.params;
    try {
      const healthHub = await HealthHub.findOne({ _id: id });
      const healthHubAppointments = healthHub?.appointments || [];;
  
      const allAppointments = await Appointment.find()
        .sort('-createdAt')
        .populate('patient')
        .populate('doctor');

      const updatedAppointments = allAppointments.filter(appointment => {
        // This checks if the appointment ID is not in healthHubAppointments
        return !healthHubAppointments.some(healthHubAppointmentId =>
          healthHubAppointmentId.equals(appointment._id)
        );
      });
  

      const refAppointment = updatedAppointments.reduce((acc, cur) => {
        if (cur.referenceHealhtHubID == id) {
          acc.push(cur);
        }
        return acc;
      }, []);
  
      
      res.status(200).json(refAppointment);
  
    } catch (e) {
      next(e);
    }
  });
  
app.get('/api/allRefAppointments',isAuthenticated,authorize(['admin']),async (req, res) => {
    try {
      const appointments = await Appointment.find({ referenceHealhtHubID: { $exists: true, $ne: null } }).sort('-createdAt').populate('referenceHealhtHubID')

      res.status(200).json(appointments);
    } catch (error) {
      console.error('Error fetching reference appointments:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });


  /**Admin */
  app.post('/api/setupAdmin',isAuthenticated,authorize(['admin']),async (req, res) => {
      const { username, credential, password } = req.body;
      try{
        const existingAdmin = await User.findOne({credential:credential});
    if (existingAdmin) return res.status(400).json({ message: 'Already used this email.'});

        const admin=new User({
            username: username,
            credential: credential,
            password: password,
            accountVerified:true,
            role:'admin'
        })

        await admin.save()
        res.status(201).json({ message: 'Admin created' });
      }catch(e){
        res.status(400).json({error:e.message})
      }

});



app.use((err,req,res,next)=>{
    const message=err.message?err.message:'Server Error Occurred';
    const status=err.status?err.status:500
    res.status(status).json({message})
})

removeUnverifiedAccounts()
connectDB(databaseUrl)
.then(async()=>{

    const existingAdmin=await User.findOne({role:'admin'})

    if(!existingAdmin) {
        const admin=new User({
            username: process.env.ADMIN_USERNAME,
            credential: process.env.ADMIN_CREDENTIAL,
            password: process.env.ADMIN_PASSWORD,
            accountVerified:true,
            role:'admin'
        })

        await admin.save()
    }

    app.listen(port,()=>{
        console.log('server is running!')
    })
    console.log('database is connected')
})