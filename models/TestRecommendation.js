const mongoose=require('mongoose')
const {Schema,model}=mongoose

const testRecommendationSchema=new Schema({
    testName:String,
    image:String
})
const TestRecommendation=model('TestRecommendation',testRecommendationSchema)

module.exports=TestRecommendation;