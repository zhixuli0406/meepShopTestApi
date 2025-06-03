const awsService = require('../services/aws.service');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

exports.generatePresignedS3Url = catchAsync(async (req, res, next) => {
  const { fileName, fileType } = req.body;
  const userId = req.user.id; 

  if (!fileName || !fileType) {
    throw new AppError('fileName and fileType are required in the request body.', 400);
  }

  const result = await awsService.generatePresignedPutUrl(fileName, fileType, userId);

  res.status(200).json({
    status: 'success',
    data: result, 
  });
}); 