const mongoose=require('mongoose')
const Patient = require('./Patient')
const Prescription = require('./Prescription')
const {Schema,model}=mongoose

const medicalRecordSchema=new Schema({
    medicalRecord:
        {
            type:Schema.Types.ObjectId,
            ref:'Appointment'
        }
})
const MedicalRecord=model('MedicalRecord',medicalRecordSchema)

module.exports=MedicalRecord;