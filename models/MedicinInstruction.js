const mongoose=require('mongoose')
const {Schema,model}=mongoose;

const medicinInstruction=new Schema({
    medicinName:String,
    dosage:String,
    frequency:String,
    duration:Number
})
const MedicinInstruction=model('MedicinInstruction',medicinInstruction)

module.exports=MedicinInstruction;