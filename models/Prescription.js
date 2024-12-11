const mongoose=require('mongoose')
const {Schema,model}=mongoose;

const prescriptionSchema=new Schema({
    date:Date,
    diagnosis:String,
    instruction:String,
    medicinInstructions:[{
        type:Schema.Types.ObjectId,
        ref:'MedicinInstruction'
    }]
})
const Prescription=model('Prescription',prescriptionSchema)

module.exports=Prescription