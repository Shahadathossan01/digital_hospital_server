const mongoose=require('mongoose')
const Patient = require('./Patient')
const Prescription = require('./Prescription')
const {Schema,model}=mongoose

const medicalRecordSchema=new Schema({
    patient:{
        type:Schema.Types.ObjectId,
        ref:'Patient'
    },
    doctor:{
        type:Schema.Types.ObjectId,
        ref:'Doctor'
    },
    diagnosis:String,
    prescription:{
        type:Schema.Types.ObjectId,
        ref:'Prescription'
    },
    testResult:{
        type:Schema.Types.ObjectId,
        ref:'TestResult'
    }
})
const MedicalRecord=model('MedicalRecord',medicalRecordSchema)

module.exports=MedicalRecord;