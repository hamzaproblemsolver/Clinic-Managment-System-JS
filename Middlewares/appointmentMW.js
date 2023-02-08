const mongoose = require("mongoose");
const nodemailer = require('nodemailer');
require("./../Models/doctorModel");
require("./../Models/appointmentModel");
require("./../Models/clinicModel");
require("./../Models/patientModel");
require("./../Models/employeeModel");
const appointmentSchema = mongoose.model("appointments");
const scheduleSchema = mongoose.model("schedules");
const doctorSchema = mongoose.model("doctors");
const clinicSchema= mongoose.model("clinics");
const patientSchema= mongoose.model("patients");
const employeeSchema = mongoose.model('employees')
const dateTimeMW = require("./../middlewares/dateTimeMW");
const {body , param} = require("express-validator");


exports.appointmentBodyValidation = [
    body("doctorId").isInt().notEmpty().withMessage("Doctor ID must be Numeric and required"),
    body("clinicId").isInt().notEmpty().withMessage("ClinicID must be Numeric and required"),
    body("patientId").isInt().notEmpty().withMessage("Patient ID must be Numeric and required"),
    body("employeeId").isInt().notEmpty().withMessage("Employee ID must be Numeric and required"),
    body("status").isIn(['First Time' , 'Follow Up']).notEmpty().withMessage("Status should be First Time or Follow Up"),
    body("reservationMethod").isIn(['Online' , 'Offline']).notEmpty().withMessage("Reservation method should be Either Online or Offline"),
    body("date").isString().notEmpty().matches(/^\d{4}\-(0?[1-9]|1[012])\-(0?[1-9]|[12][0-9]|3[01])$/).withMessage("Date must be string in format YYYY-MM-DD"),
    body("from").isString().notEmpty().matches(/^(?:(?:[0-1][0-9]|2[0-3]):[0-5]?[0-9](?::[0-5]?[0-9])?)|(?:[0-9]:[0-5]?[0-9](?::[0-5]?[0-9])?)$/).withMessage("From time must be string in format hh:mm:ss"),
]
exports.idParamValidation = [
    param('id').isInt().withMessage("Id should be interger")
]

module.exports.getEndOfAppointment=async(clinicId,doctorId,appointmentDate,startofAppointment)=>{
    try {
        let doctorSchedule=await scheduleSchema.findOne({doc_id : doctorId, date: appointmentDate, clinic_id:clinicId })
        if(doctorSchedule != null){

            let appointmentDurationInMinutes = doctorSchedule.duration_in_minutes;

            let startOfAppintmentAsDateTime= dateTimeMW.getTimeFromString(startofAppointment);

            startOfAppintmentAsDateTime.setMinutes(startOfAppintmentAsDateTime.getMinutes() + appointmentDurationInMinutes -1);
            let endOfAppintment = dateTimeMW.getTime(startOfAppintmentAsDateTime);
            return endOfAppintment;
        }
        else{
            return null;
        }
    }
    catch (error) {
        console.log(error);
        return null;
      }
}
module.exports.checkIfThisTimeSlotIsFree= async(appointmentId,clinicId,doctorId,appointmentDate,startOfAppointment ,endOfAppointment)=>{
    try {
        let doctorSchedule = await scheduleSchema.findOne({doc_id : doctorId , date: appointmentDate, clinic_id : clinicId })
        if(doctorSchedule != null){

            console.log(doctorSchedule);
            let startOfShift = dateTimeMW.getDateTimeForSpecificDay(doctorSchedule.from , appointmentDate);
            let endOfShift = dateTimeMW.getDateTimeForSpecificDay(doctorSchedule.to , appointmentDate);
            
            let startOfAppointmentAsDatetime = dateTimeMW.getDateTimeForSpecificDay(dateTimeMW.getTimeFromString(startOfAppointment), appointmentDate);
            let endOfAppointmentAsDatetime = dateTimeMW.getDateTimeForSpecificDay(dateTimeMW.getTimeFromString(endOfAppointment), appointmentDate);
            
            if (checkIsTimeInEmployeeShift(startOfAppointmentAsDatetime , endOfAppointmentAsDatetime , startOfShift , endOfShift))
            {
                console.log("here");
                let isNotOverlapped = await checkIfTimeOverLapWithAnotherAppointmentInSameDay(appointmentId,clinicId,doctorId, startOfAppointmentAsDatetime, endOfAppointmentAsDatetime, appointmentDate);
                console.log("overlap", isNotOverlapped);
                return isNotOverlapped;
            }
            else
                return false;
        }
        else
            return false;
    }
    catch (error) {
        console.log(error);
        return null;
      }
}
module.exports.checkAllUsersAvailability=async(doctorId,clinicId,patientId,employeeId)=>{
    let doctor = await doctorSchema.findById(doctorId);
    let clinic = await clinicSchema.findById(clinicId);
    let patient = await patientSchema.findById(patientId);
    let employee = await employeeSchema.findById(employeeId);
    console.log(doctor, clinic,patient,employee)
    if(doctor != null && clinic!= null && patient != null && employee!= null )
        return true 
    else
        return false
}
module.exports.sendMailToTheDoctor=(doctorId,appointmentDate,appointmentTime)=>{
    console.log("send MAil")
    doctorSchema.findById({_id: doctorId}).populate({path:'userData'})
    .then(doctor=>{
        let doctorMail= doctor.userData.email;
        console.log(doctorMail)
        const transporter = nodemailer.createTransport({
            host: '0.0.0.0',
            port: 1025,
            secure: false,
            auth: {
                user: 'clinicsystem82@gmail.com',
                pass: 'clinicsys82#'
            }
          });
        const mailOptions = {
            from: 'clinicsystem82@gmail.com',
            to: doctorMail,
            subject: 'New appointment added to your schedule',
            text: `A new appointment has been added to your schedule on ${appointmentDate} at ${appointmentTime}.`
          };
          
          transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
              console.log(error);
            } else {
              console.log('Email sent: ' + info.response);
            }
          });
    })
    .catch(error=>next(error));  
}
module.exports.sortAppointment = (data,query)=>{
    let sortBy = query.sortBy||'date';
    let order = query.order ||"asc";
    let orderValue = order ==="asc"? 1:-1

    if (sortBy=='doctorName' || sortBy == 'doctorname'){
        data.sort((a, b) => {
            if (a.doctor_id.userData.fullName < b.doctor_id.userData.fullName) {
                return -1*orderValue;
            }
            if (a.doctor_id.userData.fullName > b.doctor_id.userData.fullName) {
                return 1*orderValue;
            }
            return 0;
        });
    }
    else if (sortBy=='patientName' || sortBy == 'patientname'){
        data.sort((a, b) => {
            if (a.patient_id.userData.fullName < b.patient_id.userData.fullName) {
                return -1*orderValue;
            }
            if (a.patient_id.userData.fullName > b.patient_id.userData.fullName) {
                return 1*orderValue;
            }
            return 0;
        });
    }
    else if (sortBy=='employeeName' || sortBy == 'employeename'){
        data.sort((a, b) => {
            if (a.employee_id.userData.fullName < b.employee_id.userData.fullName) {
                return -1*orderValue;
            }
            if (a.employee_id.userData.fullName > b.employee_id.userData.fullName) {
                return 1*orderValue;
            }
            return 0;
        });
    }
    else{
        return data.sort((a,b)=>{
            if(a[sortBy]<b[sortBy]) return -1*orderValue;
            if(a[sortBy]>b[sortBy]) return 1*orderValue;
        });
    }
};

function checkIsTimeInEmployeeShift(startOfAppointment , endOfAppointment , startOfShift , endOfShift){
    return startOfAppointment >= startOfShift && endOfAppointment <= endOfShift
}
async function checkIfTimeOverLapWithAnotherAppointmentInSameDay(appointmentId,clinicId,doctorId,startOfAppointment, endOfAppintment,appointmentDate){
    try{
        let allAppointments= await appointmentSchema.find({doctor_id : doctorId , date:appointmentDate , clinic_id:clinicId , _id: {$ne: appointmentId}})
        for(let i=0 ; i < allAppointments.length ; i++)
        {
            let from= allAppointments[i].from;
            let to = allAppointments[i].to;

            let currentFrom = dateTimeMW.getDateTimeForSpecificDay(from , appointmentDate);
            let currentTo = dateTimeMW.getDateTimeForSpecificDay(to , appointmentDate);
            if (startOfAppointment <= currentFrom && endOfAppintment >= currentFrom || startOfAppointment <= currentTo &&  endOfAppintment >= currentTo || startOfAppointment <= currentFrom && endOfAppintment >= currentTo || startOfAppointment >= currentFrom && endOfAppintment <= currentTo)
                return false;
        }
        return true;
    }
    catch (error) {
        console.log(error);
        return null;
      }
}