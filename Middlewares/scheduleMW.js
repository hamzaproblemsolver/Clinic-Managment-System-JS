
const {body, param} = require("express-validator");

exports.scheduleValidation = [
    // body("clinic_id").isInt().withMessage("Clinic_id is invalid"),
    body("date").isString().notEmpty().matches(/^\d{4}\-(0?[1-9]|1[012])\-(0?[1-9]|[12][0-9]|3[01])$/).withMessage("Date must be string in format YYYY-MM-DD"),
    body("startTime").isString().notEmpty().matches(/^(?:(?:[0-1][0-9]|2[0-3]):[0-5]?[0-9](?::[0-5]?[0-9])?)|(?:[0-9]:[0-5]?[0-9](?::[0-5]?[0-9])?)$/).withMessage("Start time must be string in format hh:mm:ss"),
    body("endTime").isString().notEmpty().matches(/^(?:(?:[0-1][0-9]|2[0-3]):[0-5]?[0-9](?::[0-5]?[0-9])?)|(?:[0-9]:[0-5]?[0-9](?::[0-5]?[0-9])?)$/).withMessage("End time must be string in format hh:mm:ss"),
    body('duration').isInt().withMessage("Duration is invalid")
]