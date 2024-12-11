const mongoose=require('mongoose')
const {Schema,model}=mongoose;

const testResultSchema=new Schema({
    name:String,
    image:String
})
const TestResult=model('TestResult',testResultSchema)

module.exports=TestResult