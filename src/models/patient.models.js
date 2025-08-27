import mongoose,{Schema} from "mongoose";

const patientSchema = new Schema({
    userId : {
        type : Schema.Types.ObjectId,
        ref : "User",
        required : true
    },
    dateOfBirth : {
        type : Date,
        required : true
    },
    
},{timestamps : true});

export const Patient = mongoose.model("Patient",patientSchema);