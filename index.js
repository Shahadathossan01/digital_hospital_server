const express=require('express')
const app=express()
const port=3000
const cors=require('cors')
const connectDB = require('./db')
const User = require('./models/User')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken');
const Patient = require('./models/Patient')
const Doctor = require('./models/Doctor')
const Admin = require('./models/Admin')
const error = require('./utils/error')
const PatientProfile = require('./models/PatientProfile')
const Appointment = require('./models/Appointment')
const TestRecommendation = require('./models/TestRecommendation')
const MedicinInstruction = require('./models/MedicinInstruction')
const Prescription = require('./models/Prescription')
const TestResult = require('./models/TestResult')
const ApplyForAppointment = require('./models/ApplyForAppointment')
app.use(cors())
app.use(express.json())

/**Health Check */
app.get('/health',(req,res)=>{
    res.send('Health is Good!')
})

/**Authentication */
app.post('/register',async(req,res,next)=>{
    const {username,email,password}=req.body
    const updateRole=req.body.role?req.body.role:'patient'
    if(!username || !email || !password){
        throw error('Invalid Data',400)
    }
    try{
        let user=await User.findOne({email})
        if(user){
            throw error('User already exists',400)
        }
        user=new User({username,email,password,role:updateRole})
        const salt = bcrypt.genSaltSync(10);
        const hash=bcrypt.hashSync(password,salt)
        user.password=hash
        user.role==='patient' && await Patient.create({
            _id:user._id
        })
        user.role==='doctor' && await Doctor.create({
            _id:user._id
        })
        user.role==='admin' && await Admin.create({
            _id:user._id
        })
        await user.save()
        return res.status(200).json({message:'User Created Successfully',user})
    }catch(error){
        next(error)
    }
})
app.post('/login',async(req,res,next)=>{
    const {email,password}=req.body
    if(!email || !password){
        throw error('Invalid Data',400)
    }
    try{
        const user=await User.findOne({email})
        if(!user){
            throw error('Invalid Credential',400)
        }
        const isMatch=await bcrypt.compare(password,user.password)
        if(!isMatch){
            throw error('Invalid Credencial',400)
        }
        delete user._doc.password
        const token=jwt.sign(user._doc,'secret-key')
        const payload={
            id:user._id,
            username:user.username,
            email:user.email,
            role:user.role
        }
        return res.status(200).json({message:'Login Successfully',token,payload})
    }catch(e){
        next(error)
    }
})
app.delete('/user/:id',async(req,res)=>{
    const {id}=req.params
    const deleteUser=await User.findByIdAndDelete(id)
    deleteUser.role==='patient' && await Patient.findByIdAndDelete(id)
    deleteUser.role==='doctor' && await Doctor.findByIdAndDelete(id)
    deleteUser.role==='admin' && await Admin.findByIdAndDelete(id)
    res.status(200).json({message:'User Deleted Successfully'})
})

/**Patient*/
app.get('/patient/:id',async(req,res)=>{
    const {id}=req.params
    const user=await Patient.findById(id).populate({
        path: 'appointments',
        populate: [
            { path: 'testRecommendation' },
            { path: 'testResults' }
        ]
    }).populate('medicalRecords')
    res.status(200).json(user)
})
app.patch('/patient/:id',async(req,res,error)=>{
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
app.delete('/patients/:id',async(req,res)=>{
    const {id}=req.params
    const deletedPatient=await Patient.findByIdAndDelete(id)
    res.status(200).json({message:'Deleted Successfully'})
})
app.patch('/patientAppointment/:id',async(req,res)=>{
    //Body:(appointmentID,doctorID)
    const {id}=req.params
    const {appointmentID,doctorID}=req.body
    const updatedAppointment=await Patient.findByIdAndUpdate(id,{
        $pull:{appointments:appointmentID}
    },{new:true})

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

/**Doctor */
app.get('/doctor/:id',async(req,res)=>{
    const {id}=req.params
    const doctor=await Doctor.findById(id).populate('applyForAppointments')
    res.status(200).json(doctor)
})
app.patch('/doctor/:id',async(req,res)=>{
    const {id}=req.params
    const updateFields = Object.keys(req.body).reduce((acc, key) => {
        acc[`profile.${key}`] = req.body[key];
        if(key=='appointmentLimit'){
            acc[key]=req.body[key]
        }
        return acc;
    }, {});
    const updatedDoctor=await Doctor.findByIdAndUpdate(id,
        {$set: updateFields },
        {new:true}
    )
    res.status(200).json(updatedDoctor)
})
app.delete('/doctors/:id',async(req,res)=>{
    const {id}=req.params
    const deletedDoctor=await Doctor.findByIdAndDelete(id)
    res.status(200).json({message:'Deleted Successfully'})
})
app.patch('/doctorAppointment/:id',async(req,res)=>{
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

/**Admin */
app.get('/admin/:id',async(req,res)=>{
    const {id}=req.params
    const admin=await Admin.findById(id)
    if(!admin){
        res.status(400).json({message:'admin not found'})
    }
    res.status(200).json(admin)
})
app.patch('/admin/:id',async(req,res)=>{
    const {id}=req.params
    const {firstName,lastName,avator}=req.body
    const updatedAdmin=await Admin.findByIdAndUpdate(id,
        {$set:{
            firstName:firstName,
            lastName:lastName,
            avator:avator
        }}
    )
    res.status(200).json({message:'updated successfully',updatedAdmin})
})

/**Appointment */
app.post('/appointment',async(req,res)=>{
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
            doctor:doctorID
        })
        res.status(200).json(appointment)
    }catch(e){
        next(error)
    }
})
app.get('/appointments',async(req,res)=>{
    const appointment=await Appointment.find().populate('patient').populate('doctor').populate('testRecommendation').populate({
        path: 'prescription',
        populate: {
            path: 'medicinInstructions', 
        },
    }).populate('testResults')
    res.status(200).json(appointment)
})
app.delete('/appointments/:id',async(req,res)=>{
    const {id}=req.params
    const deletedAppointment=await Appointment.findByIdAndDelete(id)
    res.status(200).json({message:"Deleted Successfully!"})
})
app.patch('/appointments/:id',async(req,res)=>{
    const {id}=req.params
    const {date,time,googleMeetLink,status}=req.body
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
    res.status(200).json({message:'Updated Successfully',updatedAppointment})
})

/**TestRecommendation */
app.post('/testRecommendations',async(req,res)=>{
    const {testName,appointmentID}=req.body

    const testRecommendation=await TestRecommendation.create({
        testName
    })
    await Appointment.findByIdAndUpdate(
        appointmentID,
        {$push:{testRecommendation:testRecommendation._id}},
        {new:true}
    )
    res.status(200).json(testRecommendation)
})
app.patch('/testRecommendations/:id',async(req,res)=>{
    const {id}=req.params
    const {testName}=req.body
    const updatedTest=await TestRecommendation.findByIdAndUpdate(id,{
        $set:{testName}
    },{new:true})
    res.status(200).json({message:'Updated Successfully'})
})
app.delete('/testRecommendations/:id',async(req,res)=>{
    const {id}=req.params
    const deletedTest=await TestRecommendation.findByIdAndDelete(id)
    res.status(200).json({message:'Deleted Successfully'})
})

/**Prescription */
app.post('/prescriptions',async(req,res)=>{
    const {date,diagnosis,instruction,appointmentID}=req.body
    const prescription=await Prescription.create({
        date,
        diagnosis,
        instruction
    })
    await Appointment.findByIdAndUpdate(appointmentID,{
        $push:{prescription:prescription._id}
    })
    res.status(200).json(prescription)
})
app.patch('/prescriptions/:id',async(req,res)=>{
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
app.delete('/prescriptions/:id',async(req,res)=>{
    const {id}=req.params
    const deletedPrescription=await Prescription.findByIdAndDelete(id)
    res.status(200).json({message:'Deleted Successfully'})
})

/**MedicinInstructions */
app.post('/medicinInstructions',async(req,res)=>{
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
app.patch('/medicinInstructions/:id',async(req,res)=>{
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
app.delete('/medicinInstructions/:id',async(req,res)=>{
    const {id}=req.params
    const deletedMedicin=await MedicinInstruction.findByIdAndDelete(id)
    res.status(200).json({message:'Deleted Successfully'})
})

/**TestResults */
app.post('/testResults',async(req,res)=>{
    const {name,image,appointmentID}=req.body
    const testResult=await TestResult.create({
        name,
        image
    })
    await Appointment.findByIdAndUpdate(appointmentID,{
        $push:{testResults:testResult._id}
    })
    res.status(200).json(testResult)
})
app.patch('/testResults/:id',async(req,res)=>{
    const {id}=req.params
    const {name,image}=req.body
    const updatedTest=await TestResult.findByIdAndUpdate(id,{
        $set:{
            name,
            image
        }
    },{new:true})
    res.status(200).json({message:'Updated Successfully'})
})
app.delete('/testResults/:id',async(req,res)=>{
    const {id}=req.params
    const deletedTest=await TestResult.findByIdAndDelete(id)
    res.status(200).json({message:'Deleted Successfully'})
})

/**Apply for Appointment */
app.post('/applyForAppointments',async(req,res)=>{
    const {date,patientName,doctorID,status,patientID}=req.body
    const applyForAppointment=await ApplyForAppointment.create({
        date,
        patientName,
        doctorID,
        status
    })
    await Doctor.findByIdAndUpdate(doctorID,{
        $push:{applyForAppointments:applyForAppointment._id}
    },)

    const appointment= await Appointment.create({
        patient:patientID,
        doctor:doctorID
    })

    await Patient.findByIdAndUpdate(patientID,{
        $push:{appointments:appointment._id}
    })
    res.status(200).json(applyForAppointment)
})
app.patch('/applyForAppointments/:id',async(req,res)=>{
    const {id}=req.params
    const {status}=req.body
    console.log(status)
    const updatedApply=await ApplyForAppointment.findByIdAndUpdate(id,{
        $set:{status}
    },{new:true})
    res.status(200).json({message:'Updated Successfully'})
})
app.delete('/applyForAppointments/:id',async(req,res)=>{
    const {id}=req.params
    const deletedApply=await ApplyForAppointment.findByIdAndDelete(id)
    res.status(200).json({message:'Deleted Successfully'})
})

app.use((err,req,res,next)=>{
    console.log(err)
    const message=err.message?err.message:'Server Error Occurred';
    const status=err.status?err.status:500
    res.status(status).json({message})
})

connectDB('mongodb+srv://hossantopu:hdp5nONqO369IUbK@digitalhospital.iatbk.mongodb.net/digital_hospital')
.then(()=>{
    app.listen(port,()=>{
        console.log('server is running!')
    })
    console.log('database is connected')
})
// mongodb+srv://hossantopu:<db_password>@digitalhospital.iatbk.mongodb.net/
// hdp5nONqO369IUbK