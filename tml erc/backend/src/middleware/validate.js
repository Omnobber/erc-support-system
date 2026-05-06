const validate = (schema, section = "body") => (req, _res, next) => {
  const { error, value } = schema.validate(req[section], {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    error.statusCode = 400;
    return next(error);
  }

  req[section] = value;
  return next();
};

module.exports = validate;
