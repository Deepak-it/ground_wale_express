const Ground = require('../models/Ground');
const asyncHandler = require('../utils/asyncHandler');
const httpError = require('../utils/httpError');

exports.createGround = asyncHandler(async (req, res) => {
  const ground = await Ground.create(req.body);
  res.status(201).json(ground);
});

exports.listGrounds = asyncHandler(async (req, res) => {
  const query = {};

  if (req.query.ownerId) {
    query.ownerId = req.query.ownerId;
  }

  if (req.query.reviewStatus) {
    query.reviewStatus = req.query.reviewStatus;
  }

  const grounds = await Ground.find(query).sort({ updatedAt: -1 });

  const payload = grounds.map((ground) => {
    const item = ground.toObject ? ground.toObject() : { ...ground };

    const addIfValid = (bucket, value) => {
      const text = typeof value === 'string' ? value.trim() : '';
      if (text && !bucket.includes(text)) {
        bucket.push(text);
      }
    };

    const allImages = [];
    if (Array.isArray(item.groundImages)) {
      for (const value of item.groundImages) {
        addIfValid(allImages, value);
      }
    }
    if (Array.isArray(item.imageUrls)) {
      for (const value of item.imageUrls) {
        addIfValid(allImages, value);
      }
    }
    addIfValid(allImages, item.image);

    return {
      ...item,
      groundImages: allImages,
      imageUrls: allImages,
      image: typeof item.image === 'string' && item.image.trim().length > 0
        ? item.image
        : (allImages[0] || ''),
    };
  });

  res.json(payload);
});

exports.getGround = asyncHandler(async (req, res) => {
  const ground = await Ground.findById(req.params.groundId);

  if (!ground) {
    throw httpError(404, 'Ground not found');
  }

  res.json(ground);
});

exports.updateGround = asyncHandler(async (req, res) => {
  const ground = await Ground.findByIdAndUpdate(req.params.groundId, req.body, {
    new: true,
    runValidators: true,
  });

  if (!ground) {
    throw httpError(404, 'Ground not found');
  }

  res.json(ground);
});

exports.submitForReview = asyncHandler(async (req, res) => {
  const ground = await Ground.findByIdAndUpdate(
    req.params.groundId,
    {
      $set: {
        reviewStatus: 'under_review',
        submittedAt: new Date(),
      },
    },
    { new: true },
  );

  if (!ground) {
    throw httpError(404, 'Ground not found');
  }

  res.json({ message: 'Ground submitted for review', ground });
});

exports.getReviewStatus = asyncHandler(async (req, res) => {
  const ground = await Ground.findById(req.params.groundId).select('groundName reviewStatus reviewNotes submittedAt');

  if (!ground) {
    throw httpError(404, 'Ground not found');
  }

  res.json(ground);
});

exports.updateFacilities = asyncHandler(async (req, res) => {
  const ground = await Ground.findByIdAndUpdate(
    req.params.groundId,
    { $set: { facilities: req.body.facilities || [] } },
    { new: true, runValidators: true },
  );

  if (!ground) {
    throw httpError(404, 'Ground not found');
  }

  res.json(ground);
});

exports.updatePricing = asyncHandler(async (req, res) => {
  const ground = await Ground.findByIdAndUpdate(
    req.params.groundId,
    { $set: { pricing: req.body.pricing || [] } },
    { new: true, runValidators: true },
  );

  if (!ground) {
    throw httpError(404, 'Ground not found');
  }

  res.json(ground);
});

exports.updateOwnershipVerification = asyncHandler(async (req, res) => {
  const ground = await Ground.findByIdAndUpdate(
    req.params.groundId,
    { $set: { ownershipProof: req.body.ownershipProof || '' } },
    { new: true },
  );

  if (!ground) {
    throw httpError(404, 'Ground not found');
  }

  res.json(ground);
});