const mongoose=require('mongoose')
const {Schema,model}=mongoose

const patientSchema=new Schema({
    // patientID:String,
    _id:String,
    profile:{
        firstName:String,
        lastName:String,
        avator:String,
        phone:Number,
        address:String,
        dateOfBirth:String,
        gender:String,
        blood:String,
        age:Number,
        height:Number,
        weight:Number
    },
    appointments:[
        {
            type:Schema.Types.ObjectId,
            ref:'Appointment'
        }
    ],
    medicalRecords:{
        type:Schema.Types.ObjectId,
        ref:'MedicalRecord'
    }
})

const Patient=model('Patient',patientSchema);

module.exports=Patient;